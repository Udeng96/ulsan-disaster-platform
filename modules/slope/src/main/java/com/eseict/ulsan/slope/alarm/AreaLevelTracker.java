package com.eseict.ulsan.slope.alarm;

import com.eseict.ulsan.slope.alarm.dto.PendingAlarm;
import com.eseict.ulsan.slope.facility.AreaLevelEvent;
import com.eseict.ulsan.slope.facility.AreaLevelEventRepository;
import com.eseict.ulsan.slope.facility.LevelName;
import com.eseict.ulsan.slope.facility.SlopeArea;
import com.eseict.ulsan.slope.facility.SlopeAreaRepository;
import com.eseict.ulsan.slope.ingest.VendorReader;
import com.eseict.ulsan.slope.ingest.dto.VendorIssuance;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 지구 단계 이력 적재 — 매분 각 지구의 단계를 보고, 바뀔 때만 구간({@link AreaLevelEvent})을 닫고 연다.
 *
 * <p>단계는 상단 지역 탭과 같다 — 업체 지구 상태와 발령 필요 단계 중 높은 것 (2026-10-14 사용자 결정).
 * 발령 필요 단계는 화면 패널과 같은 판정({@link AlarmReader#pending})을 1분 캐시에서 꺼내 쓰므로
 * 업체 조회가 늘지 않는다.
 *
 * <pre>
 * 같은 단계     → 진행 중인 구간에 새 문자 횟수·원인만 더한다
 * 올라감·내려감 → 진행 중인 구간을 닫고 새 구간 (격상 UP / 격하 DOWN)
 * 정상이 됨     → 진행 중인 구간을 닫는다
 * </pre>
 *
 * <p>격상 구간의 시작은 그 단계 업체 문자 발송 시각, 격하·종료는 패널이 내려간 시각이다. 패널은
 * 마지막 초과 뒤 180분이 지나야 내려가므로 업체 규칙(180분 지속 후 하락)과 같다.
 *
 * <p><b>업체 지구 상태를 못 읽은 분은 건너뛴다.</b> 발령 필요 캐시는 조회가 실패하면 마지막 값을
 * 돌려주는데, 그 값으로 변화를 만들지 않기 위해서다. 재기동하면 진행 중인 구간을 DB 에서 읽어
 * 그대로 이어 간다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "slope.vendor.enabled", havingValue = "true")
public class AreaLevelTracker {

    private final AlarmReader alarmReader;
    private final AlarmCache alarmCache;
    private final VendorReader vendorReader;
    private final SlopeAreaRepository areaRepository;
    private final AreaLevelEventRepository repository;

    @Transactional
    public void sync() {
        List<SlopeArea> areas = areaRepository.findAllByOrderByIdAsc();
        // 실패하면 예외가 그대로 나가 이번 분은 아무것도 남기지 않는다.
        Map<Long, String> zoneStates = vendorReader.readZoneStates(
                areas.stream().map(SlopeArea::getVendorId).toList());
        Map<String, PendingAlarm> pending = new HashMap<>();
        for (PendingAlarm p : alarmCache.pending(alarmReader::pending)) {
            pending.put(p.areaName(), p);
        }
        Map<Long, AreaLevelEvent> open = new HashMap<>();
        for (AreaLevelEvent e : repository.findByEndedAtIsNull()) {
            open.put(e.getAreaId(), e);
        }

        LocalDateTime now = LocalDateTime.now();
        for (SlopeArea area : areas) {
            AreaLevelEvent before = open.get(area.getId());
            Observation obs = observe(zoneStates.get(area.getVendorId()), pending.get(area.getName()), now);
            AreaLevelEvent fresh = apply(area.getId(), before, obs);
            if (fresh != null) {
                // 지구마다 진행 중인 구간은 하나뿐이라(유니크 인덱스) 닫은 것을 먼저 내보낸다.
                // 그냥 두면 Hibernate 가 INSERT 를 UPDATE 보다 먼저 보낸다.
                repository.flush();
                repository.save(fresh);
            }
            if (fresh != null || (before != null && !before.isOpen())) {
                log.info("단계 변화 — {} {} → {}", area.getName(),
                        LevelName.of(before == null ? LevelName.NORMAL : before.getLevel()),
                        LevelName.of(obs.level()));
            }
        }
        matchIssuance(areas);
    }

    /**
     * 한 지구의 지금 단계.
     *
     * @param level  업체 코드. 아무 단계도 아니면 NORMAL
     * @param sentAt 그 단계 이상 업체 발령 필요 문자의 최근 발송 시각. 단계가 문자에서 오지 않았으면 null
     * @param causes 원인 계측기(업체 이름)
     */
    record Observation(String level, LocalDateTime at, LocalDateTime sentAt, List<String> causes) {
    }

    /**
     * 탭과 같은 단계 = 지구 상태와 발령 필요 단계 중 높은 것.
     *
     * <p>발령 필요 목록에는 해제 필요 건도 섞이는데, 그 단계는 늘 지구 상태보다 낮아(지구 상태가 더
     * 높을 때만 해제 필요가 생긴다) 높은 쪽을 고르면 저절로 빠진다. 그래서 고른 단계가 발령 필요
     * 단계와 같을 때만 그 건의 문자 시각·원인을 쓴다.
     */
    static Observation observe(String zoneState, PendingAlarm pending, LocalDateTime now) {
        String zone = LevelName.needsAlarm(zoneState) ? zoneState : LevelName.NORMAL;
        String needed = pending == null ? null : LevelName.codeOf(pending.level());
        if (!LevelName.needsAlarm(needed)) {
            needed = null;
        }
        String level = LevelName.worse(zone, needed);
        if (needed != null && needed.equals(level)) {
            return new Observation(level, now, pending.occurredAt(), splitCauses(pending.cause()));
        }
        return new Observation(level, now, null, List.of());
    }

    /**
     * 지금 단계를 진행 중인 구간에 반영한다. {@code open} 은 여기서 바뀐다(닫히거나 횟수가 늘어남).
     *
     * @param open 그 지구의 진행 중인 구간. 없으면 null
     * @return 새로 연 구간. 없으면 null
     */
    static AreaLevelEvent apply(Long areaId, AreaLevelEvent open, Observation obs) {
        if (open != null && open.getLevel().equals(obs.level())) {
            open.observe(obs.sentAt(), obs.causes());
            return null;
        }
        if (LevelName.NORMAL.equals(obs.level())) {
            if (open != null) {
                open.end(obs.at());
            }
            return null;
        }

        String prev = open == null ? LevelName.NORMAL : open.getLevel();
        boolean up = LevelName.isWorse(obs.level(), prev);
        LocalDateTime start = obs.at();
        if (up && obs.sentAt() != null && obs.sentAt().isBefore(start)) {
            start = obs.sentAt();   // 격상은 문자가 온 시각부터
        }
        if (open != null) {
            if (start.isBefore(open.getStartedAt())) {
                start = open.getStartedAt();
            }
            open.end(start);
        }
        // 격하 구간은 그 전 문자(높은 단계일 수 있다)를 세지 않는다. 이후 문자부터 센다.
        return new AreaLevelEvent(areaId, obs.level(), prev, start, up ? obs.sentAt() : null, obs.causes());
    }

    private static List<String> splitCauses(String causes) {
        return causes == null || causes.isBlank() ? List.of() : List.of(causes.split(", "));
    }

    // ------------------------------------------------------------------ 발령 대조

    /**
     * 실제 발령이 있으면 구간에 표시한다.
     *
     * <p>발령은 구간이 열린 <i>뒤에</i> 담당자가 하는 것이라 구간을 만들 때는 알 수 없다. 발령마다
     * 그 시각 전에 시작한 같은 단계 구간 중 가장 최근 것 하나를 짝으로 고른다 — 반대로 구간에서
     * 발령을 찾으면 발령 하나가 여러 구간에 붙을 수 있다. 업체 발령은 지금까지 테스트 2건뿐이다.
     */
    private void matchIssuance(List<SlopeArea> areas) {
        List<VendorIssuance> issuances = vendorReader.readIssuances();
        if (issuances.isEmpty()) {
            return;
        }
        Map<Long, Long> areaIdByVendorId = new HashMap<>();
        for (SlopeArea area : areas) {
            areaIdByVendorId.put(area.getVendorId(), area.getId());
        }
        for (VendorIssuance v : issuances) {
            Long areaId = areaIdByVendorId.get(v.zoneVendorId());
            if (areaId == null || v.issuedAt().isBefore(AlarmRule.TEST_UNTIL)) {
                continue;   // 남구 밖 지구, 업체 테스트 발령
            }
            repository.findTopByAreaIdAndLevelAndStartedAtLessThanEqualOrderByStartedAtDesc(
                            areaId, v.level(), v.issuedAt())
                    .filter(e -> !e.isIssued())
                    .ifPresent(e -> {
                        e.markIssued(v.issuer());
                        log.info("발령 확인 — 구간 {} ({}) 발령자 {}", e.getId(), LevelName.of(e.getLevel()), v.issuer());
                    });
        }
    }
}
