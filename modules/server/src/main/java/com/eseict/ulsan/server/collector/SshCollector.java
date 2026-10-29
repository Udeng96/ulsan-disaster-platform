package com.eseict.ulsan.server.collector;

import com.eseict.ulsan.server.config.MonitorProperties;
import com.eseict.ulsan.server.domain.HostMetrics;
import com.eseict.ulsan.server.domain.KeyMetricSample;
import com.eseict.ulsan.server.domain.ResourceLayout;
import com.eseict.ulsan.server.domain.MeasureMode;
import com.eseict.ulsan.server.domain.Snapshot;
import com.eseict.ulsan.server.entity.Server;
import com.eseict.ulsan.server.host.db.DbStatsReader;
import com.eseict.ulsan.server.host.live.HostLive;
import com.eseict.ulsan.server.host.live.HostLiveService;
import org.apache.sshd.client.SshClient;
import org.apache.sshd.client.config.hosts.HostConfigEntry;
import org.apache.sshd.client.config.hosts.HostConfigEntryResolver;
import org.apache.sshd.client.session.ClientSession;
import org.apache.sshd.common.config.keys.loader.KeyPairResourceLoader;
import org.apache.sshd.common.keyprovider.KeyIdentityProvider;
import org.apache.sshd.common.util.security.SecurityUtils;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.security.KeyPair;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

/**
 * 2단계(live) 수집기 — 3~10·12번 리눅스. 키 로그인 전용 계정 admin-ro 로 들어가 읽기 명령만 실행한다.
 * 명령 목록은 고정이며 sudo 없음. 비밀값을 읽는 명령은 없다. 한 번의 세션에 명령 1개(/proc 읽기)라 서버 부하는 무시할 수준.
 *
 * 켜는 법: monitor.collector.mode=live, monitor.collector.ssh.enabled=true, targets 에 host·address·port.
 * SSH 포트 규칙(현장 발견): 10 + (IP 끝자리 − 100) + 22 → 10022~10622, 12번만 8022.
 * 12번은 9번(106)에서만 SSH 가 열려 있어 via: intlinksvr 로 9번을 거쳐 들어간다(사용자 10-16). 9번 admin-ro 에 TCP 전달 허용 필요.
 *
 * 상세 ④ ⑤ ⑥ (4~10·12번 공통 규칙, 사용자 10-16): 같은 세션에서 접속 상대(ss)·주고받은 누적 바이트·주요 서비스(pgrep)를 더 읽어
 * HostLiveService 에 넘긴다. 전부 일반 계정으로 읽힌다(sudo 없음).
 */
@Component
@Order(10)
@ConditionalOnProperty(prefix = "monitor.collector.ssh", name = "enabled", havingValue = "true")
public class SshCollector implements CollectorPort {

    private static final Logger log = LoggerFactory.getLogger(SshCollector.class);

    /** 한 줄짜리 묶음 명령. 구분자 사이에 각 항목. 전부 읽기 전용. */
    static final String COMMAND = String.join("; echo '@@'; ",
            "cat /proc/uptime",                                   // 0 가동 초
            "cat /proc/loadavg",                                  // 1 부하 1/5/15
            "nproc",                                              // 2 스레드
            "free -b | awk '/^Mem:/{print $2, $3, $7}'",         // 3 total used available
            "df -P / | awk 'NR==2{print $5}'",                    // 4 시스템디스크 %
            "df -P /data 2>/dev/null | awk 'NR==2{print $5}'",    // 5 데이터디스크 % (없으면 빈 줄)
            "for n in /sys/class/net/*; do b=$(basename $n); [ \"$b\" = lo ] && continue; echo \"$b $(cat $n/operstate)\"; done", // 6 NIC
            "systemctl list-units --type=service --state=running --no-legend --plain 2>/dev/null | awk '{print $1}' | sed 's/.service$//' | head -40", // 7 서비스
            "ss -Htn state established 2>/dev/null | awk '{print $3, $4}'",   // 8 연결: 내 주소:포트 상대 주소:포트
            // 9 받은·보낸 누적 바이트. 묶음(bond) 아래 카드·가상 카드는 겹쳐 세지 않게 뺀다
            "for n in /sys/class/net/*; do b=$(basename $n); case $b in lo|veth*|docker*|br-*|virbr*) continue;; esac; "
                    + "[ -e $n/master ] && continue; echo \"$b $(cat $n/statistics/rx_bytes) $(cat $n/statistics/tx_bytes)\"; done",
            // 10 디스크 (전면 표). FSUSED 가 없는 옛 lsblk 면 크기만
            "lsblk -nbP -o NAME,TYPE,SIZE,ROTA,FSUSED,FSSIZE,PKNAME,MODEL 2>/dev/null || lsblk -nbP -o NAME,TYPE,SIZE,ROTA,PKNAME,MODEL",
            // 11 실제 랜카드 (후면 표): 이름 상태 속도 받은 보낸 묶음
            "for n in /sys/class/net/*; do [ -e $n/device ] || continue; s=$(cat $n/speed 2>/dev/null); m=$(readlink $n/master); m=${m##*/}; "
                    + "echo \"$(basename $n) $(cat $n/operstate) ${s:--} $(cat $n/statistics/rx_bytes) $(cat $n/statistics/tx_bytes) ${m:--}\"; done"
    );
    static final int BASE_PARTS = 12;

    private final MonitorProperties.Ssh cfg;
    private final Map<String, MonitorProperties.Ssh.Target> targets = new HashMap<>();
    private final Clock clock;
    private final SshClient client;
    private final HostLiveService live;

    public SshCollector(MonitorProperties props, Clock clock, HostLiveService live) throws Exception {
        this.cfg = props.collector().ssh();
        this.clock = clock;
        this.live = live;
        for (MonitorProperties.Ssh.Target t : cfg.targets()) targets.put(t.host(), t);
        for (MonitorProperties.Ssh.Target t : cfg.targets())
            if (t.via() != null && !t.via().isBlank() && !targets.containsKey(t.via()))
                throw new IllegalStateException("SSH via 대상 없음: " + t.host() + " → " + t.via());
        Path keyPath = Path.of(cfg.privateKeyPath());
        KeyPairResourceLoader loader = SecurityUtils.getKeyPairResourceParser();
        List<KeyPair> keys = new ArrayList<>(loader.loadKeyPairs(null, keyPath, null));
        if (keys.isEmpty()) throw new IllegalStateException("SSH 키 없음: " + keyPath);
        this.client = SshClient.setUpDefaultClient();
        this.client.setKeyIdentityProvider(KeyIdentityProvider.wrapKeyPairs(keys));   // 거쳐 가는 서버에도 같은 키
        this.client.setHostConfigEntryResolver(HostConfigEntryResolver.EMPTY);          // 실행 계정의 ~/.ssh/config 를 쓰지 않음
        this.client.start();
        log.info("ssh collector ready: {} targets, user={}", targets.size(), cfg.user());
    }

    @Override
    public boolean supports(Server server) {
        return server.getMeasureMode() == MeasureMode.DIRECT && targets.containsKey(server.getHost());
    }

    @Override
    public Optional<Snapshot> collect(Server server) {
        MonitorProperties.Ssh.Target t = targets.get(server.getHost());
        Duration timeout = cfg.timeout() == null ? Duration.ofSeconds(8) : cfg.timeout();
        try (ClientSession session = client.connect(entry(t)).verify(timeout).getSession()) {
            session.auth().verify(timeout);
            String out = session.executeRemoteCommand(command(t));
            Instant now = clock.instant();
            live.record(server.getHost(), parseLive(out, now, t));
            return Optional.of(parse(out, now, server.getResourceLayout()));
        } catch (Exception e) {
            log.warn("ssh {} ({}:{}) 실패: {}", server.getHost(), t.address(), t.port(), e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public String name() { return "ssh"; }

    @PreDestroy
    public void close() {
        client.stop();
    }

    /** via 가 있으면 그 서버를 거쳐 들어간다 (ssh -J 와 같음). */
    HostConfigEntry entry(MonitorProperties.Ssh.Target t) {
        String jump = null;
        if (t.via() != null && !t.via().isBlank()) {
            MonitorProperties.Ssh.Target v = targets.get(t.via());
            jump = cfg.user() + "@" + v.address() + ":" + v.port();
        }
        return new HostConfigEntry("", t.address(), t.port(), cfg.user(), jump);
    }

    /**
     * 고정 명령 + 주요 서비스마다 「실행 중이면 몇 초째인지」 한 줄.
     * 한 칸이 실패해도(명령 없음 · 서비스 멈춤) 나머지를 살리려고 오류 출력은 버리고 끝 상태를 0 으로 — 원격 명령은 둘 중 하나만 있어도 실패로 본다.
     */
    static String command(MonitorProperties.Ssh.Target t) {
        StringBuilder b = new StringBuilder(COMMAND);
        for (MonitorProperties.Ssh.MainService m : t.services()) {
            b.append("; echo '@@'; ");
            if (m.unit() != null && !m.unit().isBlank()) {
                // 등록된 서비스: 켜져 있으면 「active」 + 주 프로세스가 켜진 뒤 초. systemctl 옛 판(--value 없음)도 되게 cut
                // 이름을 쉼표로 여러 개 적으면(geomex.service,tomcat.service — 사용자 10-16 「둘 중 하나」) 처음 켜져 있는 것
                StringBuilder list = new StringBuilder();
                for (String u : m.unit().split(",")) list.append(" '").append(unit(u.trim())).append("'");
                b.append("for u in").append(list).append("; do systemctl is-active -q \"$u\" || continue; echo active; ")
                        .append("p=$(systemctl show -p MainPID \"$u\" | cut -d= -f2); [ \"${p:-0}\" -gt 0 ] && ps -o etimes= -p $p; break; done");
            } else {
                b.append("p=$(pgrep -o -f '").append(selfSafe(m.process())).append("'); [ -n \"$p\" ] && ps -o etimes= -p $p");
            }
        }
        return "{ " + b + "; } 2>/dev/null; true";
    }

    /**
     * pgrep -f 가 이 명령을 보내는 셸 자신을 찾지 않게 첫 글자를 [n]ginx 처럼 바꾼다(정규식 뜻은 같음).
     * 설정 값이 셸로 가므로 작은따옴표는 막는다.
     */
    static String selfSafe(String process) {
        if (process == null || process.isBlank() || process.contains("'"))
            throw new IllegalArgumentException("services.process 가 비었거나 작은따옴표가 있음: " + process);
        char c = process.charAt(0);
        return Character.isLetterOrDigit(c) ? "[" + c + "]" + process.substring(1) : process;
    }

    private static final java.util.regex.Pattern UNIT = java.util.regex.Pattern.compile("[A-Za-z0-9@._:-]+");

    /** 서비스 이름은 셸로 가므로 글자·숫자·@._:- 만 받는다. */
    static String unit(String unit) {
        if (!UNIT.matcher(unit).matches())
            throw new IllegalArgumentException("services.unit 에 쓸 수 없는 글자가 있음: " + unit);
        return unit;
    }

    /** ④ ⑤ ⑥ 재료. 깨진 칸은 빈 값. */
    static HostLive parseLive(String out, Instant now, MonitorProperties.Ssh.Target t) {
        String[] part = out.split("@@", -1);
        String peers = part.length > 8 ? part[8] : "", net = part.length > 9 ? part[9] : "";
        List<HostLive.ServiceState> svc = new ArrayList<>();
        for (int i = 0; i < t.services().size(); i++) {
            String s = part.length > BASE_PARTS + i ? part[BASE_PARTS + i].trim() : "";
            Double sec = firstDouble(s);
            boolean running = s.startsWith("active") || sec != null;   // 등록된 서비스는 「active」 만 있어도 실행 중(시작 시각 모름)
            svc.add(new HostLive.ServiceState(t.services().get(i).name(), running,
                    sec == null ? null : now.minusSeconds(Math.round(sec))));
        }
        long[] bytes = netBytes(net);
        return new HostLive(now, peers(peers, t.port()), svc, bytes == null ? null : bytes[0], bytes == null ? null : bytes[1],
                disks(part.length > 10 ? part[10] : ""), nics(part.length > 11 ? part[11] : ""));
    }

    private static final java.util.regex.Pattern KV = java.util.regex.Pattern.compile("(\\w+)=\"([^\"]*)\"");

    /**
     * lsblk -P 줄 → 디스크 목록. 디스크 아래(파티션 · md · lvm)의 파일시스템 사용량을 그 디스크에 더한다.
     * md 미러처럼 한 장치가 두 디스크 아래 나오면 두 디스크 모두에 더해진다(「미러」 — 둘 다 같은 사용량).
     */
    static List<HostLive.Disk> disks(String lines) {
        Map<String, Map<String, String>> dev = new LinkedHashMap<>();
        List<Map<String, String>> all = new ArrayList<>();
        for (String line : lines.split("\n")) {
            Map<String, String> m = new HashMap<>();
            var k = KV.matcher(line);
            while (k.find()) m.put(k.group(1), k.group(2));
            if (!m.containsKey("NAME")) continue;
            all.add(m);
            dev.putIfAbsent(m.get("NAME"), m);
        }
        Map<String, long[]> fs = new HashMap<>();
        Set<String> seen = new HashSet<>();
        for (Map<String, String> m : all) {
            Long used = parseLong(m.get("FSUSED")), size = parseLong(m.get("FSSIZE"));
            if (used == null || size == null) continue;
            String disk = "disk".equals(m.get("TYPE")) ? m.get("NAME") : topDisk(m.get("PKNAME"), all, 0);   // 파티션 없이 통째로 쓰는 디스크는 자기 자신
            if (disk == null || !seen.add(disk + "/" + m.get("NAME"))) continue;
            long[] a = fs.computeIfAbsent(disk, x -> new long[2]);
            a[0] += used;
            a[1] += size;
        }
        List<HostLive.Disk> out = new ArrayList<>();
        for (Map<String, String> m : dev.values()) {
            if (!"disk".equals(m.get("TYPE"))) continue;
            String name = m.get("NAME");
            Long size = parseLong(m.get("SIZE"));
            if (size == null || size == 0) continue;
            String rota = m.get("ROTA");
            long[] f = fs.get(name);
            String model = m.getOrDefault("MODEL", "").trim();
            out.add(new HostLive.Disk(name, size, rota == null || rota.isBlank() ? null : "0".equals(rota.trim()),
                    model.isEmpty() ? null : model, f == null ? null : f[0], f == null ? null : f[1]));
        }
        return out;
    }

    /** 부모를 거슬러 올라가 disk 를 찾는다. 같은 이름이 여러 부모 아래 나오면(md) 첫 부모 쪽. */
    private static String topDisk(String name, List<Map<String, String>> all, int depth) {
        if (name == null || name.isBlank() || depth > 8) return null;
        for (Map<String, String> m : all) {
            if (!name.equals(m.get("NAME"))) continue;
            if ("disk".equals(m.get("TYPE"))) return name;
            return topDisk(m.get("PKNAME"), all, depth + 1);
        }
        return null;
    }

    /** 「이름 상태 속도 받은 보낸 묶음」 → 랜카드 목록. 속도 -1·「-」 은 모름. */
    static List<HostLive.Nic> nics(String lines) {
        List<HostLive.Nic> out = new ArrayList<>();
        for (String line : lines.split("\n")) {
            String[] a = line.trim().split("\\s+");
            if (a.length < 5) continue;
            Long rx = parseLong(a[3]), tx = parseLong(a[4]);
            if (rx == null || tx == null) continue;
            Long sp = parseLong(a[2]);
            String master = a.length > 5 && !"-".equals(a[5]) ? a[5] : null;
            out.add(new HostLive.Nic(a[0], "up".equalsIgnoreCase(a[1]), sp == null || sp <= 0 ? null : sp.intValue(), rx, tx, master));
        }
        return out;
    }

    private static Long parseLong(String s) {
        if (s == null || s.isBlank()) return null;
        try { return Long.parseLong(s.trim()); } catch (NumberFormatException e) { return null; }
    }

    /** 「내 주소:포트 상대 주소:포트」 줄 → 상대 IP 별 개수. 같은 서버 안(127.x · ::1)과 SSH 포트로 들어온 연결은 뺀다. */
    static List<DbStatsReader.Peer> peers(String lines, int sshPort) {
        Map<String, Long> n = new TreeMap<>();
        for (String line : lines.split("\n")) {
            String[] a = line.trim().split("\\s+");
            if (a.length < 2) continue;
            if (sshPort > 0 && String.valueOf(sshPort).equals(port(a[0]))) continue;
            String ip = ip(a[1]);
            if (ip == null || ip.startsWith("127.") || ip.equals("::1")) continue;
            n.merge(ip, 1L, Long::sum);
        }
        return n.entrySet().stream().map(e -> new DbStatsReader.Peer(e.getKey(), e.getValue())).toList();
    }

    private static String port(String addr) {
        int i = addr.lastIndexOf(':');
        return i < 0 ? null : addr.substring(i + 1);
    }

    /** 192.0.2.146:51234 · [::ffff:192.0.2.146]:51234 · [fe80::1%eno1]:22 → IP. */
    private static String ip(String addr) {
        int i = addr.lastIndexOf(':');
        if (i <= 0) return null;
        String ip = addr.substring(0, i).replace("[", "").replace("]", "");
        int pct = ip.indexOf('%');
        if (pct >= 0) ip = ip.substring(0, pct);
        return ip.startsWith("::ffff:") ? ip.substring(7) : ip;
    }

    /** 「카드 받은 보낸」 줄들의 합. 한 줄도 못 읽으면 null. */
    static long[] netBytes(String lines) {
        long rx = 0, tx = 0;
        boolean any = false;
        for (String line : lines.split("\n")) {
            String[] a = line.trim().split("\\s+");
            if (a.length < 3) continue;
            try {
                rx += Long.parseLong(a[1]);
                tx += Long.parseLong(a[2]);
                any = true;
            } catch (NumberFormatException ignore) { }
        }
        return any ? new long[]{rx, tx} : null;
    }

    /** 출력 → 스냅샷. 한 항목이 깨져도 나머지는 살린다(null). 읽은 시각 = 접속해 명령을 실행한 지금. */
    static Snapshot parse(String out, Instant now, ResourceLayout layout) {
        Parsed p = parseOutput(out);
        return new Snapshot(now, now, "SSH", p.uptimeDays(), p.nicLinks(), p.services(),
                p.metrics().resources(layout), KeyMetricSample.EMPTY, null);
    }

    record Parsed(Double uptimeDays, HostMetrics metrics, String nicLinks, String services) {}

    static Parsed parseOutput(String out) {
        String[] part = out.split("@@");
        String[] p = new String[BASE_PARTS];
        for (int i = 0; i < BASE_PARTS; i++) p[i] = i < part.length ? part[i].trim() : "";

        Double uptimeDays = firstDouble(p[0]) == null ? null : firstDouble(p[0]) / 86400.0;
        String[] la = p[1].split("\\s+");
        Double l1 = la.length > 0 ? parse(la[0]) : null, l5 = la.length > 1 ? parse(la[1]) : null, l15 = la.length > 2 ? parse(la[2]) : null;
        Integer threads = firstDouble(p[2]) == null ? null : (int) Math.round(firstDouble(p[2]));

        Double memPct = null;
        String[] m = p[3].split("\\s+");
        if (m.length >= 3 && parse(m[0]) != null && parse(m[2]) != null && parse(m[0]) > 0)
            memPct = round1((1 - parse(m[2]) / parse(m[0])) * 100);

        Double diskRoot = pct(p[4]);
        Double diskData = p[5].isBlank() ? null : pct(p[5]);
        String nic = p[6].isBlank() ? null : String.join(" · ", p[6].lines().map(SshCollector::nicLine).toList());
        String svc = p[7].isBlank() ? null : String.join(" · ", p[7].lines().limit(12).toList()) + " 가동";

        return new Parsed(uptimeDays, new HostMetrics(threads, l1, l5, l15, null, memPct, diskRoot, diskData, null), nic, svc);
    }

    private static String nicLine(String s) {
        String[] a = s.trim().split("\\s+");
        return a.length >= 2 ? a[0].toLowerCase() + " " + a[1].toUpperCase() : s.trim();
    }

    private static Double pct(String s) {
        return firstDouble(s.replace("%", ""));
    }

    private static Double firstDouble(String s) {
        if (s == null) return null;
        for (String tok : s.trim().split("\\s+")) { Double d = parse(tok); if (d != null) return d; }
        return null;
    }

    private static Double parse(String s) {
        try { return Double.parseDouble(s.trim()); } catch (Exception e) { return null; }
    }

    private static double round1(double d) { return Math.round(d * 10.0) / 10.0; }
}
