package com.eseict.ulsan.server.sw.api;

import com.eseict.ulsan.server.sw.SwitchProperties;
import com.eseict.ulsan.server.sw.api.dto.KnownMac;
import com.eseict.ulsan.server.sw.api.dto.KnownMacRequest;
import com.eseict.ulsan.server.sw.api.dto.SwitchEvent;
import com.eseict.ulsan.server.sw.api.dto.SwitchPort;
import com.eseict.ulsan.server.sw.api.dto.SwitchSummary;
import com.eseict.ulsan.server.sw.api.dto.SwitchTraffic;
import com.eseict.ulsan.server.sw.snmp.PortChanges;
import com.eseict.ulsan.server.sw.snmp.SwEventRepository;
import com.eseict.ulsan.server.sw.snmp.SwInterface;
import com.eseict.ulsan.server.sw.snmp.SwInterfaceRepository;
import com.eseict.ulsan.server.sw.snmp.SwKnownMac;
import com.eseict.ulsan.server.sw.snmp.SwKnownMacRepository;
import com.eseict.ulsan.server.sw.snmp.SwMac;
import com.eseict.ulsan.server.sw.snmp.SwMacRepository;
import com.eseict.ulsan.server.sw.snmp.SwPortRepository;
import com.eseict.ulsan.server.sw.snmp.SwStatus;
import com.eseict.ulsan.server.sw.snmp.SwStatusRepository;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SwitchQueryService {

    static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    /** 브로드캐스트 비율이 이 % 이상이면 루핑·브로드캐스트 폭풍 전조 (화면 시안 주석). */
    static final double BROADCAST_HIGH_PCT = 5.0;
    /** 응답 배경색 기준 (화면 시안 주석): 1~5ms 노랑, 5ms 이상 빨강. */
    static final int RTT_WARN_MS = 1;
    static final int RTT_FAIL_MS = 5;

    private final SwStatusRepository statusRepository;
    private final SwInterfaceRepository interfaceRepository;
    private final SwMacRepository macRepository;
    private final SwKnownMacRepository knownMacRepository;
    private final SwPortRepository portRepository;
    private final SwEventRepository eventRepository;
    private final SwitchProperties props;
    private final Clock clock;

    public SwitchSummary summary() {
        SwStatus s = statusRepository.findTopByOrderByCollectedAtDesc().orElse(null);
        List<SwInterface> latest = interfaceRepository.findLatest();
        Integer memPct = s == null || s.getMemTotalKb() == null || s.getMemTotalKb() == 0 || s.getMemUsedKb() == null
                ? null : (int) (s.getMemUsedKb() * 100 / s.getMemTotalKb());
        Double bcast = broadcastPct(latest);
        return new SwitchSummary(
                s == null ? null : s.getCollectedAt(),
                s == null || s.getUptimeSec() == null ? null : s.getUptimeSec() / 86400,
                s == null || s.getUptimeSec() == null ? null
                        : s.getCollectedAt().minusSeconds(s.getUptimeSec()).atZoneSameInstant(SEOUL).toOffsetDateTime(),
                s == null ? null : s.getRttMs(),
                s == null ? null : s.getLoad1m(),
                memPct,
                latest.stream().filter(SwInterface::isLinkUp).count(),
                latest.size(),
                errorCounts().keySet().stream().sorted(PORT_ORDER).map(PortChanges::label).toList(),
                trafficGbps(latest),
                bcast,
                bcast != null && bcast >= BROADCAST_HIGH_PCT,
                s == null ? null : "결선");
    }

    /** ge1…ge24, xe1…xe4 순서. */
    static final java.util.Comparator<String> PORT_ORDER = java.util.Comparator
            .comparing((String n) -> n.startsWith("xe") ? 1 : 0)
            .thenComparing(n -> { try { return Integer.parseInt(n.replaceAll("\\D", "")); } catch (NumberFormatException e) { return 0; } });

    static Double trafficGbps(List<SwInterface> ports) {
        long sum = 0;
        boolean any = false;
        for (SwInterface i : ports) {
            if (i.getInBps() == null) continue;
            sum += i.getInBps();
            any = true;
        }
        return any ? round(sum / 1e9, 2) : null;
    }

    static Double broadcastPct(List<SwInterface> ports) {
        long pps = 0, bc = 0;
        boolean any = false;
        for (SwInterface i : ports) {
            if (i.getInPps() == null || i.getBcastPps() == null) continue;
            pps += i.getInPps();
            bc += i.getBcastPps();
            any = true;
        }
        return !any ? null : pps == 0 ? 0.0 : round(bc * 100.0 / pps, 1);
    }

    private Map<String, Long> errorCounts() {
        OffsetDateTime since = OffsetDateTime.now(clock).minus(props.errorWindow());
        Map<String, Long> m = new HashMap<>();
        for (Object[] r : interfaceRepository.errorIncreaseSince(since)) m.put((String) r[0], ((Number) r[1]).longValue());
        return m;
    }

    /** ③ 트래픽 그래프. range = 24h | 7d. */
    public SwitchTraffic traffic(String range) {
        OffsetDateTime now = OffsetDateTime.now(clock);
        LocalDateTime local = now.atZoneSameInstant(SEOUL).toLocalDateTime();
        boolean week = "7d".equals(range);
        LocalDateTime end = week ? local.truncatedTo(ChronoUnit.DAYS) : local.truncatedTo(ChronoUnit.HOURS);
        LocalDateTime start = week ? end.minusDays(7) : end.minusHours(24);
        OffsetDateTime from = start.atZone(SEOUL).toOffsetDateTime();
        OffsetDateTime to = end.atZone(SEOUL).toOffsetDateTime();
        String unit = week ? "day" : "hour";

        Map<LocalDateTime, Object[]> traffic = new HashMap<>();
        for (Object[] r : interfaceRepository.trafficBuckets(unit, from, to)) traffic.put(toLocal(r[0]), r);
        Map<LocalDateTime, Integer> rtt = new HashMap<>();
        for (Object[] r : statusRepository.rttBuckets(unit, from, to)) {
            if (r[1] != null) rtt.put(toLocal(r[0]), ((Number) r[1]).intValue());
        }
        Double base = interfaceRepository.averageTotalBps(now.minusDays(7));
        return chart(week ? "7d" : "24h", base == null ? null : round(base / 1e9, 2), start, week ? 7 : 24,
                week ? ChronoUnit.DAYS : ChronoUnit.HOURS, traffic, rtt);
    }

    static SwitchTraffic chart(String range, Double baselineGbps, LocalDateTime start, int n, ChronoUnit unit,
                               Map<LocalDateTime, Object[]> traffic, Map<LocalDateTime, Integer> rtt) {
        List<SwitchTraffic.Point> points = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            LocalDateTime at = start.plus(i, unit);
            Object[] t = traffic.get(at);
            Double gbps = t == null || t[1] == null ? null : round(((Number) t[1]).doubleValue() / 1e9, 2);
            Double bc = t == null || t[2] == null ? null : round(((Number) t[2]).doubleValue(), 1);
            Integer r = rtt.get(at);
            points.add(new SwitchTraffic.Point(at.atZone(SEOUL).toOffsetDateTime(), gbps, r, rttLevel(r),
                    bc, bc != null && bc >= BROADCAST_HIGH_PCT));
        }
        return new SwitchTraffic(range, baselineGbps, points);
    }

    static String rttLevel(Integer ms) {
        if (ms == null) return null;
        return ms >= RTT_FAIL_MS ? "FAIL" : ms >= RTT_WARN_MS ? "WARN" : "OK";
    }

    private static LocalDateTime toLocal(Object o) {
        if (o instanceof Timestamp t) return t.toLocalDateTime();
        if (o instanceof LocalDateTime l) return l;
        throw new IllegalStateException("구간 시각 형식을 모름: " + o.getClass());
    }

    /** ⑥ 최근 활동 N건. */
    public List<SwitchEvent> events(int limit) {
        return eventRepository.findByOrderByAtDescIdDesc(PageRequest.of(0, limit)).stream()
                .map(e -> new SwitchEvent(e.getAt(), PortChanges.label(e.getIfName()), e.getKind().name(), e.getDetail()))
                .toList();
    }

    public List<SwitchPort> ports() {
        Map<String, SwInterface> latest = interfaceRepository.findLatest().stream()
                .collect(Collectors.toMap(SwInterface::getIfName, Function.identity()));
        Map<String, List<String>> macs = macRepository.findAll().stream()
                .collect(Collectors.groupingBy(SwMac::getIfName, Collectors.mapping(SwMac::getMac, Collectors.toList())));
        Set<String> known = knownMacRepository.findAll().stream().map(SwKnownMac::getMac).collect(Collectors.toSet());
        Map<String, Long> errors = errorCounts();
        return portRepository.findAllByOrderBySortNoAsc().stream().map(p -> {
            SwInterface i = latest.get(p.getIfName());
            List<String> m = macs.getOrDefault(p.getIfName(), List.of());
            return new SwitchPort(p.getIfName(), PortChanges.label(p.getIfName()), p.getHost(), p.getNote(),
                    i != null && i.isLinkUp(),
                    i == null ? null : i.getSpeedMbps(),
                    i == null ? null : i.getInBps(),
                    i == null ? null : i.getOutBps(),
                    errors.getOrDefault(p.getIfName(), 0L),
                    m,
                    // 아는 장비 표가 비어 있으면(처음 켜기 전) 모두 미확인이 되므로 표시하지 않는다
                    known.isEmpty() ? List.of() : m.stream().filter(x -> !known.contains(x)).toList());
        }).toList();
    }

    public List<KnownMac> knownMacs() {
        return knownMacRepository.findAll().stream()
                .map(k -> new KnownMac(k.getMac(), k.getIfName(), k.getNote(), k.getRegisteredAt()))
                .toList();
    }

    /** 「아는 장비로 등록」. 이미 있으면 메모만 바꾼다. 지금 보이는 포트를 같이 적는다. */
    @Transactional
    public KnownMac registerKnownMac(KnownMacRequest req) {
        String mac = req.mac().toLowerCase(Locale.ROOT);
        String ifName = macRepository.findById(mac).map(SwMac::getIfName).orElse(null);
        SwKnownMac saved = knownMacRepository.save(new SwKnownMac(mac, ifName, req.note(), OffsetDateTime.now(clock)));
        return new KnownMac(saved.getMac(), saved.getIfName(), saved.getNote(), saved.getRegisteredAt());
    }

    private static double round(double v, int digits) {
        double f = Math.pow(10, digits);
        return Math.round(v * f) / f;
    }
}
