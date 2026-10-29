package com.eseict.ulsan.server.firewall.api;

import com.eseict.ulsan.server.domain.KeyMetricRule;
import com.eseict.ulsan.server.domain.KeyMetricSample;
import com.eseict.ulsan.server.firewall.api.dto.FirewallBlockChart;
import com.eseict.ulsan.server.firewall.api.dto.FirewallBlockType;
import com.eseict.ulsan.server.firewall.api.dto.FirewallEvent;
import com.eseict.ulsan.server.firewall.api.dto.FirewallPort;
import com.eseict.ulsan.server.firewall.api.dto.FirewallSummary;
import com.eseict.ulsan.server.firewall.snmp.FwInterface;
import com.eseict.ulsan.server.firewall.snmp.FwInterfaceRepository;
import com.eseict.ulsan.server.firewall.snmp.FwPolicy;
import com.eseict.ulsan.server.firewall.snmp.FwPolicyChange;
import com.eseict.ulsan.server.firewall.snmp.FwPolicyChangeRepository;
import com.eseict.ulsan.server.firewall.snmp.FwPolicyRepository;
import com.eseict.ulsan.server.firewall.snmp.FwPortRepository;
import com.eseict.ulsan.server.firewall.snmp.FwStatus;
import com.eseict.ulsan.server.firewall.snmp.FwStatusRepository;
import com.eseict.ulsan.server.firewall.syslog.FwLogRepository;
import com.eseict.ulsan.server.firewall.syslog.FwLogTags;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FirewallQueryService {

    static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    /** ⑤ 정책이 바뀐 뒤 「변경」을 보여 주는 시간. 지나면 「유지」로 돌아간다. */
    static final Duration POLICY_CHANGED_FOR = Duration.ofHours(24);
    static final String POLICY_CHANGED = "변경";
    static final String POLICY_KEPT = "유지";
    /** 최근 활동(⑥)에 정책 변경을 섞을 때 쓰는 tag. fw_log 에는 없는 값. */
    static final String POLICY_CHANGE_TAG = "policy_change";
    /** ⑪ 화면 이름. 정의서 받기 전 임시 구분 (사용자 결정 2026-10-15). */
    static final Map<String, String> BLOCK_LABELS = Map.of(
            "fw4_deny", "IPv4 차단", "fw6_deny", "IPv6 차단", "threat", "위협");
    private static final List<String> BLOCK_ORDER = List.of("fw4_deny", "fw6_deny", "threat");

    private final FwStatusRepository statusRepository;
    private final FwInterfaceRepository interfaceRepository;
    private final FwPolicyRepository policyRepository;
    private final FwPolicyChangeRepository policyChangeRepository;
    private final FwPortRepository portRepository;
    private final FwLogRepository logRepository;
    private final Clock clock;

    public FirewallSummary summary() {
        OffsetDateTime now = OffsetDateTime.now(clock);
        FwStatus s = statusRepository.findTopByOrderByCollectedAtDesc().orElse(null);
        List<FwPolicy> policies = policyRepository.findAll();
        OffsetDateTime dayAgo = now.minusDays(1);
        long day = logRepository.countByTagInAndReceivedAtAfter(FwLogTags.BLOCK, dayAgo);
        double baseline = baseline(now);
        // 판정은 메인 카드 핵심값과 같은 규칙(2배 주의 · 3배 장애)을 쓴다
        var judged = KeyMetricRule.BLOCKED_VS_BASELINE.apply(new KeyMetricSample((double) day, null, baseline, null, null), now.toInstant());
        OffsetDateTime changedAt = policyChangeRepository.findTopByOrderByChangedAtDesc().map(FwPolicyChange::getChangedAt).orElse(null);
        // 전원은 SNMP 항목이 없다. 전원 고장 경고(요청서 「참고」에서 켜 둠)가 alert 로그로 온다고 보고 본문 낱말로 찾는다 — 실제 로그 형식 확인 전 가정
        long powerAlerts = s == null ? 0 : logRepository.countPowerAlertsSince(FwLogTags.ALERT, dayAgo);
        return new FirewallSummary(
                s == null ? null : s.getCollectedAt(),
                s == null || s.getUptimeSec() == null ? null : s.getUptimeSec() / 86400,
                s == null || s.getUptimeSec() == null ? null : s.getCollectedAt().minusSeconds(s.getUptimeSec()).atZoneSameInstant(SEOUL).toOffsetDateTime(),
                s == null ? null : s.getRttMs(),
                s == null ? null : s.getSessionCnt(),
                s == null ? null : s.getCpuPct(),
                s == null ? null : s.getMemPct(),
                s == null ? null : s.getCpuTempC(),
                s == null || s.getFanRpm() == null ? List.of() : Arrays.asList(s.getFanRpm()),
                policies.size(),
                policies.stream().filter(p -> "ALLOW".equals(p.getAction())).count(),
                changedAt,
                policyStatus(changedAt, now),
                day,
                baseline,
                baseline > 0 ? Math.round(day / baseline * 10) / 10.0 : null,
                judged.verdict().name(),
                logRepository.countByTagInAndReceivedAtAfter(FwLogTags.ALERT, dayAgo),
                s == null ? null : powerAlerts > 0 ? "이상" : "공급 중",
                s == null ? null : "ON");
    }

    static String policyStatus(OffsetDateTime changedAt, OffsetDateTime now) {
        return changedAt != null && changedAt.isAfter(now.minus(POLICY_CHANGED_FOR)) ? POLICY_CHANGED : POLICY_KEPT;
    }

    /** 평소값 = 지난 7일 차단 건수 ÷ 7 (메인 카드 핵심값과 같음). */
    private double baseline(OffsetDateTime now) {
        return logRepository.countByTagInAndReceivedAtAfter(FwLogTags.BLOCK, now.minusDays(7)) / 7.0;
    }

    /** ③ 차단 그래프. range = 24h | 7d. */
    public FirewallBlockChart blocks(String range) {
        OffsetDateTime now = OffsetDateTime.now(clock);
        LocalDateTime local = now.atZoneSameInstant(SEOUL).toLocalDateTime();
        boolean week = "7d".equals(range);
        // 끝난 구간만: 24h 는 이번 시 시작 전 24시간, 7d 는 오늘 0시 전 7일
        LocalDateTime end = week ? local.truncatedTo(ChronoUnit.DAYS) : local.truncatedTo(ChronoUnit.HOURS);
        LocalDateTime start = week ? end.minusDays(7) : end.minusHours(24);
        List<Object[]> rows = logRepository.countBuckets(week ? "day" : "hour", FwLogTags.BLOCK,
                start.atZone(SEOUL).toOffsetDateTime(), end.atZone(SEOUL).toOffsetDateTime());
        Map<LocalDateTime, Long> counts = new HashMap<>();
        for (Object[] r : rows) counts.put(toLocal(r[0]), ((Number) r[1]).longValue());
        return chart(week ? "7d" : "24h", baseline(now), start, week ? 7 : 24, week ? ChronoUnit.DAYS : ChronoUnit.HOURS, counts);
    }

    static FirewallBlockChart chart(String range, double baseline, LocalDateTime start, int n, ChronoUnit unit,
                                    Map<LocalDateTime, Long> counts) {
        int factor = unit == ChronoUnit.HOURS ? 24 : 1;   // 1시간 건수 × 24 = 일평균 환산
        List<FirewallBlockChart.Point> points = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            LocalDateTime at = start.plus(i, unit);
            long c = counts.getOrDefault(at, 0L);
            points.add(new FirewallBlockChart.Point(at.atZone(SEOUL).toOffsetDateTime(), c, (double) c * factor));
        }
        double b = Math.round(baseline * 10) / 10.0;
        return new FirewallBlockChart(range, b, b * 2, b * 3, points);
    }

    private static LocalDateTime toLocal(Object o) {
        if (o instanceof Timestamp t) return t.toLocalDateTime();
        if (o instanceof LocalDateTime l) return l;
        if (o instanceof java.time.Instant i) return LocalDateTime.ofInstant(i, java.time.ZoneOffset.UTC);
        throw new IllegalStateException("구간 시각 형식을 모름: " + o.getClass());
    }

    /** ⑪ 유형별 내역 — 지난 24시간 차단을 tag 로 나눈 건수. 0 건인 종류도 보여 준다. */
    public List<FirewallBlockType> blockTypes() {
        Map<String, Long> counts = new HashMap<>();
        for (Object[] r : logRepository.countByTagSince(FwLogTags.BLOCK, OffsetDateTime.now(clock).minusDays(1))) {
            counts.put((String) r[0], ((Number) r[1]).longValue());
        }
        return BLOCK_ORDER.stream()
                .map(t -> new FirewallBlockType(t, BLOCK_LABELS.get(t), counts.getOrDefault(t, 0L)))
                .toList();
    }

    public List<FirewallPort> ports() {
        Map<String, FwInterface> latest = interfaceRepository.findLatest().stream()
                .collect(Collectors.toMap(FwInterface::getIfName, Function.identity()));
        return portRepository.findAllByOrderBySortNoAsc().stream().map(p -> {
            FwInterface i = latest.get(p.getIfName());
            return new FirewallPort(p.getLabel(), p.getIfName(),
                    i == null ? null : i.getZone(), p.getUsage(), p.getPeer(),
                    i != null && i.isLinkUp(),
                    i == null ? null : i.getSpeed(),
                    i == null ? null : i.getInBps(),
                    i == null ? null : i.getOutBps());
        }).toList();
    }

    /** ⑥ 최근 활동 — 경고·관리자·차단 로그와 정책 변경 기록을 시각 순으로 섞어 최근 N건. */
    public List<FirewallEvent> events(int limit) {
        PageRequest page = PageRequest.of(0, limit);
        Stream<FirewallEvent> logs = logRepository.findByTagInOrderByReceivedAtDesc(FwLogTags.EVENT, page).stream()
                .map(l -> new FirewallEvent(l.getDeviceAt() != null ? l.getDeviceAt() : l.getReceivedAt(), l.getTag(), l.getBody(),
                        summarize(l.getTag(), l.getBody())));
        Stream<FirewallEvent> changes = policyChangeRepository.findByOrderByChangedAtDesc(page).stream()
                .map(c -> new FirewallEvent(c.getChangedAt(), POLICY_CHANGE_TAG, c.summary(), c.summary()));
        return Stream.concat(logs, changes)
                .sorted(Comparator.comparing(FirewallEvent::at).reversed())
                .limit(limit)
                .toList();
    }

    /**
     * 화면 한 줄 요약. audit CSV 는 "장비시각,장비명,계정,접속IP,3,메뉴,동작,결과,…" 순이라 계정·IP·메뉴·동작·결과만 뽑는다.
     * LOG_COMMIT 처럼 뒤에 JSON(쉼표 포함)이 붙는 건 앞 8칸만 쓰므로 영향 없다. 형식을 모르는 태그는 원문 그대로.
     */
    static String summarize(String tag, String body) {
        if (!"audit".equals(tag)) {
            return body;
        }
        String[] f = body.split(",", 9);
        if (f.length < 8) {
            return body;
        }
        return f[2] + "(" + f[3] + ") · " + f[5] + " · " + f[6] + " · " + f[7];
    }
}
