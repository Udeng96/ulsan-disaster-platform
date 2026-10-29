package com.eseict.ulsan.server.firewall;

import com.eseict.ulsan.server.collector.CollectorPort;
import com.eseict.ulsan.server.domain.KeyMetricSample;
import com.eseict.ulsan.server.domain.ResourceKind;
import com.eseict.ulsan.server.domain.ResourceLayout;
import com.eseict.ulsan.server.domain.ResourceReading;
import com.eseict.ulsan.server.domain.Snapshot;
import com.eseict.ulsan.server.entity.Server;
import com.eseict.ulsan.server.firewall.snmp.FwStatus;
import com.eseict.ulsan.server.firewall.snmp.FwStatusRepository;
import com.eseict.ulsan.server.firewall.syslog.FwLogRepository;
import com.eseict.ulsan.server.firewall.syslog.FwLogTags;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * 1번 방화벽을 공통 판정(메인 카드 · 랙 색 · 상세)에 넘긴다.
 * SNMP 수집기(FirewallSnmpCollector)가 10초마다 쌓은 fw_status 최신 1줄 + fw_log 차단 건수 → 측정 1회.
 * 읽은 시각 = fw_status.collected_at. SNMP 가 멈추면 같은 시각이 계속 와서 저장되지 않고, 오래됨 판정이 색을 바꾼다.
 *
 * 자원 4칸: 로그SSD % · 메모리 % · CPU % · 세션 수(기준 없음, 파랑).
 * 핵심값: 24시간 차단 건수 ÷ 평소값(지난 7일 하루 평균).
 */
@Component
@Order(1)
@ConditionalOnProperty(prefix = "firewall.snmp", name = "enabled", havingValue = "true")
public class FirewallMonitorCollector implements CollectorPort {

    private final FwStatusRepository statusRepository;
    private final FwLogRepository logRepository;
    private final FirewallProperties props;
    private final Clock clock;

    public FirewallMonitorCollector(FwStatusRepository statusRepository, FwLogRepository logRepository,
                                    FirewallProperties props, Clock clock) {
        this.statusRepository = statusRepository;
        this.logRepository = logRepository;
        this.props = props;
        this.clock = clock;
    }

    @Override
    public boolean supports(Server server) {
        return server.getResourceLayout() == ResourceLayout.FIREWALL;
    }

    @Override
    public Optional<Snapshot> collect(Server server) {
        Optional<FwStatus> latest = statusRepository.findTopByOrderByCollectedAtDesc();
        if (latest.isEmpty()) return Optional.empty();
        FwStatus s = latest.get();
        Instant read = s.getCollectedAt().toInstant();

        OffsetDateTime now = OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
        long day = logRepository.countByTagInAndReceivedAtAfter(FwLogTags.BLOCK, now.minusDays(1));
        long week = logRepository.countByTagInAndReceivedAtAfter(FwLogTags.BLOCK, now.minusDays(7));

        return Optional.of(new Snapshot(read, read, "SNMP",
                s.getUptimeSec() == null ? null : s.getUptimeSec() / 86400.0,
                null, null, resources(s, props.capacity()),
                new KeyMetricSample((double) day, null, week / 7.0, null, null), null));
    }

    @Override
    public String name() { return "firewall"; }

    static List<ResourceReading> resources(FwStatus s, FirewallProperties.Capacity cap) {
        Double log = s.getDiskLogPct() == null ? null : s.getDiskLogPct().doubleValue();
        String logDetail = log == null || cap.logDiskGb() == null ? null
                : Math.round(log * cap.logDiskGb() / 100) + "G/" + cap.logDiskGb() + "G";

        Double mem = s.getMemPct() == null ? null : s.getMemPct().doubleValue();
        // 메모리 단위는 KB 로 본다 — 실장비 값 확인 전 (담당자 확인사항)
        String memDetail = s.getMemUsed() == null || s.getMemTotal() == null ? null
                : gb(s.getMemUsed()) + "/" + gb(s.getMemTotal());

        Double cpu = s.getCpuPct() == null ? null : s.getCpuPct().doubleValue();
        String cpuDetail = cap.cpuCores() == null ? null : cap.cpuCores() + "코어";

        Integer sess = s.getSessionCnt();
        Double sessPct = sess == null || cap.sessionMax() == null || cap.sessionMax() <= 0 ? null
                : Math.round(sess * 1000.0 / cap.sessionMax()) / 10.0;
        String sessDetail = sess == null ? null
                : man(sess) + (cap.sessionMax() == null ? "" : "/" + man(cap.sessionMax()));

        return List.of(
                ResourceReading.of(ResourceKind.LOG_SSD, log, logDetail),
                ResourceReading.of(ResourceKind.MEMORY, mem, memDetail),
                ResourceReading.of(ResourceKind.CPU, cpu, cpuDetail),
                ResourceReading.of(ResourceKind.SESSION, sessPct, sessDetail));
    }

    /** KB → 「6.6G」. */
    static String gb(long kb) {
        return trim(kb / 1024.0 / 1024.0) + "G";
    }

    /** 124000 → 「12.4만」, 8000000 → 「800만」, 9999 이하는 그대로. */
    static String man(long n) {
        return n < 10000 ? String.valueOf(n) : trim(n / 10000.0) + "만";
    }

    private static String trim(double d) {
        String t = String.format("%.1f", d);
        return t.endsWith(".0") ? t.substring(0, t.length() - 2) : t;
    }
}
