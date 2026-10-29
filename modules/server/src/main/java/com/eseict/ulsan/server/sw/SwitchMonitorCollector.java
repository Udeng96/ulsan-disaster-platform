package com.eseict.ulsan.server.sw;

import com.eseict.ulsan.server.collector.CollectorPort;
import com.eseict.ulsan.server.domain.KeyMetricSample;
import com.eseict.ulsan.server.domain.ResourceKind;
import com.eseict.ulsan.server.domain.ResourceLayout;
import com.eseict.ulsan.server.domain.ResourceReading;
import com.eseict.ulsan.server.domain.Snapshot;
import com.eseict.ulsan.server.entity.Server;
import com.eseict.ulsan.server.sw.snmp.SwInterface;
import com.eseict.ulsan.server.sw.snmp.SwInterfaceRepository;
import com.eseict.ulsan.server.sw.snmp.SwStatus;
import com.eseict.ulsan.server.sw.snmp.SwStatusRepository;
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
 * 2번 스위치를 공통 판정(메인 카드 · 랙 색 · 상세)에 넘긴다.
 * SNMP 수집기(SwitchSnmpCollector)가 10초마다 쌓은 sw_status · sw_interface 최신값 → 측정 1회.
 * 읽은 시각 = sw_status.collected_at.
 *
 * 자원 4칸: CPU(부하) · 메모리 % · 포트 사용(꽂힌 수/전체, 파랑) · 대역폭 %(꽂힌 포트 속도 합 대비).
 * 핵심값: 전체 트래픽 Gbps(포트마다 받은 양의 합) + 에러 포트 수(switch.error-window 안에 에러가 늘어난 포트).
 */
@Component
@Order(2)
@ConditionalOnProperty(prefix = "switch.snmp", name = "enabled", havingValue = "true")
public class SwitchMonitorCollector implements CollectorPort {

    private final SwStatusRepository statusRepository;
    private final SwInterfaceRepository interfaceRepository;
    private final SwitchProperties props;
    private final Clock clock;

    public SwitchMonitorCollector(SwStatusRepository statusRepository, SwInterfaceRepository interfaceRepository,
                                  SwitchProperties props, Clock clock) {
        this.statusRepository = statusRepository;
        this.interfaceRepository = interfaceRepository;
        this.props = props;
        this.clock = clock;
    }

    @Override
    public boolean supports(Server server) {
        return server.getResourceLayout() == ResourceLayout.SWITCH;
    }

    @Override
    public Optional<Snapshot> collect(Server server) {
        Optional<SwStatus> latest = statusRepository.findTopByOrderByCollectedAtDesc();
        if (latest.isEmpty()) return Optional.empty();
        SwStatus s = latest.get();
        Instant read = s.getCollectedAt().toInstant();
        List<SwInterface> ports = interfaceRepository.findLatest();

        OffsetDateTime since = OffsetDateTime.ofInstant(clock.instant().minus(props.errorWindow()), ZoneOffset.UTC);
        List<String> errorPorts = interfaceRepository.findErrorPortsSince(since);
        Double gbps = trafficGbps(ports);

        return Optional.of(new Snapshot(read, read, "SNMP",
                s.getUptimeSec() == null ? null : s.getUptimeSec() / 86400.0,
                null, null, resources(s, ports, props.cpuCores()),
                new KeyMetricSample(gbps, (double) errorPorts.size(), null,
                        errorPorts.isEmpty() ? null : errorPorts.stream().map(com.eseict.ulsan.server.sw.snmp.PortChanges::label).collect(java.util.stream.Collectors.joining(" · ")), null),
                null));
    }

    @Override
    public String name() { return "switch"; }

    static List<ResourceReading> resources(SwStatus s, List<SwInterface> ports, Integer cpuCores) {
        // 1 CPU — 코어 수를 알면 부하 ÷ 코어 = %, 모르면 부하 숫자만
        Double load = s.getLoad1m() == null ? null : s.getLoad1m().doubleValue();
        ResourceReading cpu;
        if (load != null && cpuCores != null && cpuCores > 0) {
            cpu = ResourceReading.of(ResourceKind.CPU, round1(load / cpuCores * 100), "부하 " + trim(load) + "/" + cpuCores + "코어");
        } else {
            cpu = ResourceReading.of(ResourceKind.LOAD, null, load == null ? null : "부하 " + trim(load));
        }

        // 2 메모리 (KB)
        Double memPct = s.getMemTotalKb() == null || s.getMemTotalKb() == 0 || s.getMemUsedKb() == null ? null
                : round1(s.getMemUsedKb() * 100.0 / s.getMemTotalKb());
        String memDetail = memPct == null ? null : gb(s.getMemUsedKb()) + "/" + gb(s.getMemTotalKb());

        // 3 포트 사용
        long up = ports.stream().filter(SwInterface::isLinkUp).count();
        Double portPct = ports.isEmpty() ? null : round1(up * 100.0 / ports.size());
        String portDetail = ports.isEmpty() ? null : up + "/" + ports.size();

        // 4 대역폭 — 꽂힌 포트마다 큰 쪽(받기·보내기) 합 ÷ 그 포트들 속도 합
        long used = 0, cap = 0;
        boolean any = false;
        for (SwInterface i : ports) {
            if (!i.isLinkUp() || i.getSpeedMbps() == null || i.getInBps() == null || i.getOutBps() == null) continue;
            used += Math.max(i.getInBps(), i.getOutBps());
            cap += i.getSpeedMbps() * 1_000_000L;
            any = true;
        }
        Double bwPct = !any || cap == 0 ? null : round1(used * 100.0 / cap);
        String bwDetail = !any ? null : trim(used / 1e9) + "/" + trim(cap / 1e9) + "Gbps";

        return List.of(cpu,
                ResourceReading.of(ResourceKind.MEMORY, memPct, memDetail),
                ResourceReading.of(ResourceKind.PORT_USAGE, portPct, portDetail),
                ResourceReading.of(ResourceKind.BANDWIDTH, bwPct, bwDetail));
    }

    /** 포트마다 받은 양(in)의 합 = 스위치를 지나간 전체 트래픽. 첫 샘플(bps 없음)뿐이면 null. */
    static Double trafficGbps(List<SwInterface> ports) {
        long sum = 0;
        boolean any = false;
        for (SwInterface i : ports) {
            if (i.getInBps() == null) continue;
            sum += i.getInBps();
            any = true;
        }
        return any ? sum / 1e9 : null;
    }

    private static String gb(long kb) {
        return trim(kb / 1024.0 / 1024.0) + "G";
    }

    private static double round1(double d) {
        return Math.round(d * 10.0) / 10.0;
    }

    private static String trim(double d) {
        String t = String.format("%.1f", d);
        return t.endsWith(".0") ? t.substring(0, t.length() - 2) : t;
    }
}
