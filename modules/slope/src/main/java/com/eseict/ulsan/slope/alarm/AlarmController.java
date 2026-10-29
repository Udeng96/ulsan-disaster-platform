package com.eseict.ulsan.slope.alarm;

import com.eseict.ulsan.slope.alarm.dto.AlarmEventResponse;
import com.eseict.ulsan.slope.alarm.dto.AlarmMapItem;
import com.eseict.ulsan.slope.alarm.dto.AlarmStats;
import com.eseict.ulsan.slope.alarm.dto.MonthlyCount;
import com.eseict.ulsan.slope.alarm.dto.PendingAlarm;
import com.eseict.ulsan.slope.alarm.dto.ZoneCount;
import com.eseict.ulsan.slope.facility.AreaLevelEvent;
import com.eseict.ulsan.slope.facility.AreaLevelEventRepository;
import com.eseict.ulsan.slope.facility.LevelName;
import com.eseict.ulsan.slope.facility.SlopeArea;
import com.eseict.ulsan.slope.facility.SlopeAreaRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 발령 조회. {@code /slope} 는 context-path. 조기경보·통계 화면을 그린다.
 *
 * <pre>
 * GET /slope/api/alarms/pending                발령 필요. 당일, 실시간
 * GET /slope/api/alarms/history                발령 이력. 당일, 실시간
 * GET /slope/api/alarms/stats?from=&to=        발령·해제·발령 필요 건수 + 단계별 + 월별
 * GET /slope/api/alarms/map?from=&to=          지도 버블용 지구별 건수
 * </pre>
 *
 * <p><b>왼쪽 두 패널(발령 필요·발령 이력)은 기간 필터가 없다.</b> "지금 상황" 을 보는 것이라
 * 당일 기준으로 실시간 갱신한다. 오른쪽 통계(stats·map)만 기간 선택
 * (오늘/7일/30일/기간설정)과 연동된다.
 *
 * <p>집계 규칙은 {@link AlarmRule} 에 모여 있다 — 업체 답변에 따라 바뀔 수 있어서다.
 */
@RestController
@RequestMapping("/api/alarms")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "slope.vendor.enabled", havingValue = "true")
public class AlarmController {

    private final AlarmReader reader;
    private final AlarmCache cache;
    private final SlopeAreaRepository areaRepository;
    private final AreaLevelEventRepository eventRepository;

    /** 캐시 1분. 화면이 몇 대든 업체 조회는 분당 1회로 고정된다. */
    @GetMapping("/pending")
    public List<PendingAlarm> pending() {
        return cache.pending(reader::pending);
    }

    /**
     * 발령 이력 — <b>단계 이력</b> 전체, 최근 것부터 (2026-10-01 클라이언트 요청, 10-14 기준 변경).
     * 남구청은 발령을 하지 않아 실제 발령 기록 대신 우리가 쌓은 {@link AreaLevelEvent} 구간을
     * 한 줄씩 보여준다.
     */
    @GetMapping("/history")
    public List<AlarmEventResponse> history() {
        Map<Long, String> names = areaNames();
        return eventRepository.findAllByOrderByStartedAtDescIdDesc().stream()
                .map(e -> new AlarmEventResponse(
                        names.get(e.getAreaId()), e.getIssuer(),
                        LevelName.of(e.getPrevLevel()), LevelName.of(e.getLevel()), e.getStartedAt(), null,
                        e.getDirection(), e.getLastSentAt(), e.getSendCount(), e.getEndedAt(), e.getCauses()))
                .toList();
    }

    /** 월별 추이는 기간과 무관하게 항상 최근 12개월이라 여기 함께 담는다. */
    @GetMapping("/stats")
    public AlarmStats stats(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        AlarmReader.AlarmCounts counts = reader.counts(from, to);
        List<AreaLevelEvent> needed = eventsWithin(from, to);
        Map<String, Integer> neededByLevel = new LinkedHashMap<>();
        for (AreaLevelEvent e : needed) {
            neededByLevel.merge(LevelName.of(e.getLevel()), 1, Integer::sum);
        }
        return new AlarmStats(counts.issued(), counts.released(), counts.byLevel(), monthly(),
                needed.size(), neededByLevel);
    }

    /** 올해 1~12월. 실제 발령은 업체 기록, 발령 필요는 그 달에 시작한 단계 구간 수. */
    private List<MonthlyCount> monthly() {
        LocalDate jan = LocalDate.now().withDayOfYear(1);
        Map<String, Integer> neededByMonth = new HashMap<>();
        for (AreaLevelEvent e : eventsWithin(jan, jan.plusYears(1).minusDays(1))) {
            neededByMonth.merge(e.getStartedAt().toString().substring(0, 7), 1, Integer::sum);
        }
        return reader.monthly().stream()
                .map(m -> new MonthlyCount(m.month(), m.count(), neededByMonth.getOrDefault(m.month(), 0)))
                .toList();
    }

    private List<AreaLevelEvent> eventsWithin(LocalDate from, LocalDate to) {
        return eventRepository.findByStartedAtGreaterThanEqualAndStartedAtLessThan(
                from.atStartOfDay(), to.plusDays(1).atStartOfDay());
    }

    private Map<Long, String> areaNames() {
        Map<Long, String> names = new HashMap<>();
        for (SlopeArea area : areaRepository.findAll()) {
            names.put(area.getId(), area.getName());
        }
        return names;
    }

    /**
     * 지도 버블. 좌표를 함께 내려 화면이 {@code /api/areas} 를 또 부르지 않아도 되게 한다.
     * 발령이 없는 지구도 {@code count: 0} 으로 포함한다 — 버블 자체는 그려야 한다.
     */
    @GetMapping("/map")
    public List<AlarmMapItem> map(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        Map<String, Integer> counts = new HashMap<>();
        for (ZoneCount z : reader.byZone(from, to)) {
            counts.put(z.areaName(), z.count());
        }
        Map<Long, Integer> needed = new HashMap<>();
        for (AreaLevelEvent e : eventsWithin(from, to)) {
            needed.merge(e.getAreaId(), 1, Integer::sum);
        }
        List<AlarmMapItem> result = new ArrayList<>();
        for (SlopeArea area : areaRepository.findAllByOrderByIdAsc()) {
            result.add(new AlarmMapItem(area.getId(), area.getName(),
                    area.getLat(), area.getLng(),
                    counts.getOrDefault(area.getName(), 0),
                    needed.getOrDefault(area.getId(), 0)));
        }
        return result;
    }
}
