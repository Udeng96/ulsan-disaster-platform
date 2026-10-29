package com.eseict.ulsan.slope.facility;

import com.eseict.ulsan.slope.facility.dto.AreaEventResponse;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 급경사지 단계 변화 이력 조회.
 *
 * <p>단계 이력({@link AreaLevelEvent})은 구간으로 쌓여 있다. 여기서는 그것을 <b>변화 한 건씩</b>
 * 풀어 보여준다 — 구간의 시작이 "직전 단계 → 이 단계" 한 건, 정상으로 닫힌 구간은 그 끝이
 * "이 단계 → 정상" 한 건 더. 다른 단계로 이어진 끝은 다음 구간의 시작과 같은 변화라 한 번만 센다.
 *
 * <p>구간은 지구 3곳에서 하루 몇 건 수준이라 전부 읽어 메모리에서 거른다. 업체 조회가 없다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AreaEventService {

    static final String HIGH = "HIGH";
    static final String LOW = "LOW";

    private final AreaLevelEventRepository eventRepository;
    private final SlopeAreaRepository areaRepository;

    /**
     * @param areaId    급경사지. null 이면 전체
     * @param eventType HIGH / LOW. null 이면 전체
     */
    public List<AreaEventResponse> search(LocalDate from, LocalDate to, Long areaId, String eventType) {
        Map<Long, String> areaNames = new HashMap<>();
        areaRepository.findAll().forEach(a -> areaNames.put(a.getId(), a.getName()));

        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();
        return changes(eventRepository.findAll()).stream()
                .filter(c -> !c.occurredAt().isBefore(start) && c.occurredAt().isBefore(end))
                .filter(c -> areaId == null || areaId.equals(c.areaId()))
                .filter(c -> eventType == null || eventType.equals(c.eventType()))
                .map(c -> new AreaEventResponse(
                        c.id(), c.areaId(), areaNames.get(c.areaId()),
                        LevelName.of(c.fromLevel()), LevelName.of(c.toLevel()),
                        c.eventType(), c.occurredAt(),
                        c.cause(), null, null, null,   // 패널 기준이라 계측기 하나의 값이 없다
                        c.issued(), c.issuer()))
                .toList();
    }

    /**
     * 구간 → 변화. 최신순.
     *
     * @param id 그 변화를 만든 구간의 id. 정상 복귀 건도 닫힌 구간의 id 다
     */
    record Change(Long id, Long areaId, String fromLevel, String toLevel, String eventType,
                  LocalDateTime occurredAt, String cause, boolean issued, String issuer) {
    }

    static List<Change> changes(List<AreaLevelEvent> periods) {
        // 다른 구간이 시작한 시각 — 그 시각에 닫힌 구간은 정상으로 돌아간 게 아니다.
        Set<String> starts = new HashSet<>();
        for (AreaLevelEvent p : periods) {
            starts.add(p.getAreaId() + "@" + p.getStartedAt());
        }
        List<Change> result = new ArrayList<>();
        for (AreaLevelEvent p : periods) {
            result.add(new Change(p.getId(), p.getAreaId(), p.getPrevLevel(), p.getLevel(),
                    AreaLevelEvent.UP.equals(p.getDirection()) ? HIGH : LOW,
                    p.getStartedAt(), p.getCauses(), p.isIssued(), p.getIssuer()));
            if (p.getEndedAt() != null && !starts.contains(p.getAreaId() + "@" + p.getEndedAt())) {
                result.add(new Change(p.getId(), p.getAreaId(), p.getLevel(), LevelName.NORMAL, LOW,
                        p.getEndedAt(), null, false, null));
            }
        }
        result.sort(Comparator.comparing(Change::occurredAt).thenComparing(Change::id).reversed());
        return result;
    }
}
