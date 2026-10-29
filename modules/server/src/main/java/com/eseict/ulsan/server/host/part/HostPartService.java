package com.eseict.ulsan.server.host.part;

import com.eseict.ulsan.server.domain.Verdict;
import com.eseict.ulsan.server.host.live.HostLive;
import com.eseict.ulsan.server.host.live.HostLiveService;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * 전면·후면 표 (사용자 2026-10-16: 시안 말고 받은 파일 + 실측).
 * 1) 사람이 넣은 줄(host_part) 그대로. measure_key(disk:sda · nic:eno3)가 있으면 그 줄에 읽은 상태·사용량·트래픽을 붙인다.
 * 2) 서버에서 읽은 디스크(전면)·랜카드(후면) 중 사람 줄에 안 붙은 것은 줄을 새로 만들어 뒤에 붙인다.
 */
@Service
public class HostPartService {

    static final String MEASURED = "서버에서 읽음";

    private final JdbcTemplate jdbc;
    private final HostLiveService live;

    public HostPartService(JdbcTemplate jdbc, HostLiveService live) {
        this.jdbc = jdbc;
        this.live = live;
    }

    record Manual(String side, String item, String content, String state, String measureKey, String source) {}

    public HostParts parts(String host) {
        List<Manual> rows = jdbc.query("""
                select p.side, p.item, p.content, p.state, p.measure_key, p.source
                  from server.host_part p join server.servers s on s.id = p.server_id
                 where s.host = ? order by p.side, p.sort_no, p.id""",
                (rs, i) -> new Manual(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6)),
                host);
        HostLive h = live.latest(host).orElse(null);
        return build(host, rows, h);
    }

    static HostParts build(String host, List<Manual> rows, HostLive h) {
        Map<String, HostLive.Disk> disks = new HashMap<>();
        Map<String, HostLive.Nic> nics = new HashMap<>();
        if (h != null) {
            for (HostLive.Disk d : h.disks()) disks.put("disk:" + d.name(), d);
            for (HostLive.Nic n : h.nics()) nics.put("nic:" + n.name(), n);
        }
        Set<String> used = new HashSet<>();
        List<HostParts.Row> front = new ArrayList<>(), rear = new ArrayList<>();
        for (Manual m : rows) {
            HostParts.Row r = new HostParts.Row(m.item(), m.content(), m.state(), null, null, m.source());
            String key = m.measureKey();
            if (key != null && disks.containsKey(key)) { r = withDisk(r, disks.get(key)); used.add(key); }
            else if (key != null && nics.containsKey(key)) { r = withNic(r, nics.get(key)); used.add(key); }
            ("FRONT".equals(m.side()) ? front : rear).add(r);
        }
        if (h != null) {
            for (HostLive.Disk d : h.disks())
                if (!used.contains("disk:" + d.name())) front.add(withDisk(new HostParts.Row(d.name(), null, null, null, null, MEASURED), d));
            for (HostLive.Nic n : h.nics())
                if (!used.contains("nic:" + n.name())) rear.add(withNic(new HostParts.Row(n.name(), null, null, null, null, MEASURED), n));
        }
        return new HostParts(host, h == null ? null : h.at(), front, rear);
    }

    /** 장착 내용이 비어 있으면 「SSD 480.1GB · 모델」, 상태 「장착」, 사용/용량 「7.6GB / 446.6GB」(파일시스템 모르면 「— / 크기」). */
    static HostParts.Row withDisk(HostParts.Row r, HostLive.Disk d) {
        String kind = d.ssd() == null ? "" : d.ssd() ? "SSD " : "HDD ";
        String content = r.content() != null ? r.content() : kind + gb(d.sizeBytes()) + (d.model() == null ? "" : " · " + d.model());
        String usage = d.fsUsed() == null ? "— / " + gb(d.sizeBytes()) : gb(d.fsUsed()) + " / " + gb(d.fsSize());
        return new HostParts.Row(r.item(), content, "장착", Verdict.OK, usage, r.source());
    }

    /** 연결 상대가 비어 있으면 「1Gbps · bond0 묶음」. 상태 연결됨(정상) / 연결 안 됨(회색 — 안 쓰는 포트일 수 있음). */
    static HostParts.Row withNic(HostParts.Row r, HostLive.Nic n) {
        List<String> c = new ArrayList<>();
        if (n.speedMbps() != null) c.add(n.speedMbps() >= 1000 ? (n.speedMbps() / 1000) + "Gbps" : n.speedMbps() + "Mbps");
        if (n.master() != null) c.add(n.master() + " 묶음");
        String content = r.content() != null ? r.content() : c.isEmpty() ? null : String.join(" · ", c);
        return new HostParts.Row(r.item(), content, n.up() ? "연결됨" : "연결 안 됨", n.up() ? Verdict.OK : null,
                "받음 " + gb(n.rxBytes()) + " · 보냄 " + gb(n.txBytes()), r.source());
    }

    /** 1000 단위(디스크 표기와 같게), 소수 한 자리. */
    static String gb(long b) {
        String[] unit = {"B", "KB", "MB", "GB", "TB"};
        double v = b;
        int u = 0;
        while (v >= 1000 && u < unit.length - 1) { v /= 1000; u++; }
        return u == 0 ? b + "B" : String.format(Locale.ROOT, "%.1f%s", v, unit[u]);
    }
}
