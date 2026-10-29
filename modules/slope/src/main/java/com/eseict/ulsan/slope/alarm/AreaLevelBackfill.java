package com.eseict.ulsan.slope.alarm;

import com.eseict.ulsan.slope.facility.AreaLevelEvent;
import com.eseict.ulsan.slope.facility.AreaLevelEventRepository;
import com.eseict.ulsan.slope.facility.LevelName;
import com.eseict.ulsan.slope.facility.SlopeArea;
import com.eseict.ulsan.slope.facility.SlopeAreaRepository;
import com.eseict.ulsan.slope.ingest.VendorReader;
import com.eseict.ulsan.slope.ingest.dto.VendorIssuance;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 단계 이력 다시 채우기 — 이력 테이블이 비어 있을 때 한 번, 지난 기간을 매분 실시간 기록과 같은
 * 규칙으로 다시 돌려 채운다 (2026-10-14 사용자 결정).
 *
 * <p>분마다 그 시각을 "지금"으로 놓고 발령 필요 판정({@link AlarmReader#need})을 해서
 * {@link AreaLevelTracker#apply} 에 넣는다. 그래서 다시 채운 구간과 이후 실시간 구간이 같은 기준이다.
 *
 * <p><b>업체 매분 판정({@code obsv_history})이 남아 있는 기간만 채운다.</b> 한 단계씩 내리는
 * 180분 규칙이 이 기록을 보기 때문이다. 업체는 한 달 정도만 남긴다(2026-10-14 확인: 최초 09-15).
 * 문자만으로는 하락을 알 수 없어(같은 단계 문자는 24시간에 한 번) 그보다 앞은 비워 둔다.
 *
 * <p>과거 지구 상태(발령으로 바뀌는 값)는 업체가 남기지 않아 정상으로 본다. 남구청은 발령을 하지
 * 않고, 업체 테스트 발령({@link AlarmRule#TEST_UNTIL} 전)은 이력에서 뺀다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "slope.vendor.enabled", havingValue = "true")
public class AreaLevelBackfill {

    private final AlarmReader alarmReader;
    private final VendorReader vendorReader;
    private final SlopeAreaRepository areaRepository;
    private final AreaLevelEventRepository repository;

    /** 이 날짜부터 채운다. 비우면 업체 기록이 남아 있는 가장 이른 시각부터. */
    @Value("${slope.history.backfill-from:}")
    private String backfillFrom;

    /**
     * 이력이 비어 있으면 채운다. 이미 있으면 아무것도 하지 않는다.
     *
     * @return 만든 구간 수
     */
    @Transactional
    public int runIfEmpty() {
        if (repository.count() > 0) {
            return 0;
        }
        LocalDateTime first = alarmReader.firstExceedRecord();
        if (first == null) {
            log.info("단계 이력 다시 채우기 — 업체 판정 기록이 없어 건너뜀");
            return 0;
        }
        // 첫 기록 시각에는 그 앞 180분이 비어 있어, 180분 뒤부터라야 판정이 온전하다.
        LocalDateTime from = first.plus(AlarmReader.RELEASE_AFTER);
        if (backfillFrom != null && !backfillFrom.isBlank()) {
            LocalDateTime wanted = LocalDate.parse(backfillFrom.trim()).atStartOfDay();
            if (wanted.isAfter(from)) {
                from = wanted;
            }
        }
        from = from.truncatedTo(ChronoUnit.MINUTES).plusMinutes(1);
        LocalDateTime to = LocalDateTime.now().truncatedTo(ChronoUnit.MINUTES);

        List<AreaLevelEvent> periods = replay(areaRepository.findAllByOrderByIdAsc(), from, to);
        repository.saveAll(periods);
        log.info("단계 이력 다시 채우기 — {} ~ {}, 구간 {}건", from, to, periods.size());
        return periods.size();
    }

    private List<AreaLevelEvent> replay(List<SlopeArea> areas, LocalDateTime from, LocalDateTime to) {
        List<Long> zoneIds = areas.stream().map(SlopeArea::getVendorId).toList();
        Map<String, List<AlarmReader.Sms>> smsByArea = new HashMap<>();
        for (AlarmReader.Sms sms : alarmReader.readSms(from.minus(AlarmReader.SMS_WINDOW))) {
            smsByArea.computeIfAbsent(sms.areaName(), k -> new ArrayList<>()).add(sms);
        }
        Map<Long, List<AlarmReader.Exceed>> exceedsByZone = new HashMap<>();
        for (AlarmReader.Exceed e : alarmReader.readExceeds(zoneIds, from.minus(AlarmReader.RELEASE_AFTER))) {
            exceedsByZone.computeIfAbsent(e.zoneId(), k -> new ArrayList<>()).add(e);
        }
        Map<Long, List<VendorIssuance>> issuancesByZone = new HashMap<>();
        for (VendorIssuance v : vendorReader.readIssuances()) {
            if (!v.issuedAt().isBefore(AlarmRule.TEST_UNTIL)) {
                issuancesByZone.computeIfAbsent(v.zoneVendorId(), k -> new ArrayList<>()).add(v);
            }
        }
        Map<Long, String> names = alarmReader.causeNames();

        List<AreaLevelEvent> result = new ArrayList<>();
        for (SlopeArea area : areas) {
            result.addAll(replayArea(area.getId(),
                    smsByArea.getOrDefault(area.getName(), List.of()),
                    exceedsByZone.getOrDefault(area.getVendorId(), List.of()),
                    issuancesByZone.getOrDefault(area.getVendorId(), List.of()),
                    names, from, to));
        }
        return result;
    }

    /**
     * 한 지구를 {@code from} 부터 {@code to} 까지 1분씩 돌린다.
     *
     * @param exceeds 시각 오름차순
     * @return 만든 구간 전부. 마지막 것은 진행 중일 수 있다
     */
    static List<AreaLevelEvent> replayArea(Long areaId, List<AlarmReader.Sms> sms, List<AlarmReader.Exceed> exceeds,
                                           List<VendorIssuance> issuances, Map<Long, String> names,
                                           LocalDateTime from, LocalDateTime to) {
        // 단계 코드 → 관측항목 → 마지막으로 넘은 시각
        Map<String, Map<Long, LocalDateTime>> lastExceed = new HashMap<>();

        List<AreaLevelEvent> result = new ArrayList<>();
        AreaLevelEvent open = null;
        int next = 0;
        int smsLo = 0;
        int smsHi = 0;
        for (LocalDateTime t = from; !t.isAfter(to); t = t.plusMinutes(1)) {
            while (next < exceeds.size() && !exceeds.get(next).at().isAfter(t)) {
                AlarmReader.Exceed e = exceeds.get(next++);
                lastExceed.computeIfAbsent(e.level(), k -> new HashMap<>()).put(e.itemId(), e.at());
            }
            // 문자는 시각 오름차순이라 25시간 창만 잘라 넘긴다 — 매분 전체를 훑지 않게.
            while (smsHi < sms.size() && !sms.get(smsHi).sentAt().isAfter(t)) {
                smsHi++;
            }
            while (smsLo < smsHi && sms.get(smsLo).sentAt().isBefore(t.minus(AlarmReader.SMS_WINDOW))) {
                smsLo++;
            }
            LocalDateTime now = t;
            AlarmReader.IssuedCheck issued = (since, level) -> AlarmReader.coveredBy(level, issuances.stream()
                    .filter(v -> v.issuedAt().isAfter(since) && !v.issuedAt().isAfter(now))
                    .map(VendorIssuance::level)
                    .toList());
            AlarmReader.Need need = AlarmReader.need(sms.subList(smsLo, smsHi), activeAt(lastExceed, t), issued, t);

            AreaLevelTracker.Observation obs = need == null
                    ? new AreaLevelTracker.Observation(LevelName.NORMAL, t, null, List.of())
                    : new AreaLevelTracker.Observation(need.level(), t, need.sentAt(),
                            List.of(AlarmReader.causeText(need.items(), names).split(", ")));
            AreaLevelEvent fresh = AreaLevelTracker.apply(areaId, open, obs);
            if (fresh != null) {
                result.add(fresh);
                open = fresh;
            } else if (open != null && !open.isOpen()) {
                open = null;
            }
        }
        return result;
    }

    /** {@code t} 전 180분 안에 넘은 관측항목, 단계별. */
    private static Map<String, Set<Long>> activeAt(Map<String, Map<Long, LocalDateTime>> lastExceed, LocalDateTime t) {
        LocalDateTime since = t.minus(AlarmReader.RELEASE_AFTER);
        Map<String, Set<Long>> active = new HashMap<>();
        lastExceed.forEach((level, items) -> items.forEach((item, at) -> {
            if (!at.isBefore(since)) {
                active.computeIfAbsent(level, k -> new TreeSet<>()).add(item);
            }
        }));
        return active;
    }
}
