package com.eseict.ulsan.slope.facility;

import com.eseict.ulsan.slope.alarm.AlarmCache;
import com.eseict.ulsan.slope.alarm.AlarmReader;
import com.eseict.ulsan.slope.alarm.dto.PendingAlarm;
import com.eseict.ulsan.slope.facility.dto.AreaResponse;
import com.eseict.ulsan.slope.facility.dto.AreaSummaryResponse;
import com.eseict.ulsan.slope.facility.dto.InstrumentResponse;
import com.eseict.ulsan.slope.facility.dto.InstrumentValue;
import com.eseict.ulsan.slope.ingest.VendorLevel;
import com.eseict.ulsan.slope.ingest.VendorReader;
import com.eseict.ulsan.slope.ingest.dto.VendorReading;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 급경사지 + 계측기 조회. 상단 지역 탭과 계측 상세 화면을 그린다.
 *
 * <p><b>상태와 값은 전부 업체 DB 에서 읽는다</b> (2026-09-30 사용자 결정). 우리 DB 에서는 이름·
 * 좌표·표시 순서 같은 고정 정보와 화면이 쓰는 id 만 가져온다 — id 가 바뀌면 화면이 부르는 차트
 * 경로도 바뀌기 때문이다.
 *
 * <table>
 *   <tr><th>항목</th><th>업체 출처</th></tr>
 *   <tr><td>지구 단계</td><td>지구 상태({@code zne_snr.zne_state})와 지금 발령이 필요한 단계 중 높은 것</td></tr>
 *   <tr><td>관측항목 단계</td><td>{@code obsv_item.crtcl_type}</td></tr>
 *   <tr><td>현재값</td><td>{@code obsv_data} 단위별 최신 행</td></tr>
 * </table>
 *
 * <p><b>지구 단계는 우리가 판단한다</b> (2026-10-06 사용자 결정). 남구청은 발령을 하지 않아 업체 지구
 * 상태는 늘 정상이다. 그래서 「발령 필요」({@link AlarmReader#pending})의 단계를 함께 본다 — 상단
 * 지역 탭과 발령 필요 목록이 같은 단계를 보여준다. 해제 필요(발령된 지구가 낮아짐)는 발령이
 * 남아 있으므로 지구 상태를 그대로 둔다.
 *
 * <p><b>계측기 장애는 표시하지 않는다</b> (클라이언트 요청). 장애 항목은 단계를 비우고 마지막
 * 값과 그 측정 시각만 준다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@ConditionalOnProperty(name = "slope.vendor.enabled", havingValue = "true")
public class SlopeAreaService {

    private final SlopeAreaRepository areaRepository;
    private final ObservationItemRepository itemRepository;
    private final VendorReader vendorReader;
    private final AlarmReader alarmReader;
    private final AlarmCache alarmCache;

    /** 요약 바 배지용 — 전체 응답에서 계측기만 뺀다. 업체 조회를 따로 하지 않는다. */
    public static List<AreaSummaryResponse> summarize(List<AreaResponse> areas) {
        return areas.stream()
                .map(a -> new AreaSummaryResponse(a.id(), a.name(), a.grade(), a.level(), a.lastMeasuredAt()))
                .toList();
    }

    public List<AreaResponse> list() {
        List<SlopeArea> areas = areaRepository.findAllByOrderByIdAsc();
        List<Long> zoneIds = areas.stream().map(SlopeArea::getVendorId).toList();
        Map<Long, String> zoneStates = vendorReader.readZoneStates(zoneIds);
        Map<String, String> needed = new HashMap<>();
        for (PendingAlarm p : alarmCache.pending(alarmReader::pending)) {
            needed.put(p.areaName(), LevelName.codeOf(p.level()));
        }
        Map<Long, ItemLive> live = latestByItem(vendorReader.readRecent(zoneIds));

        Map<Long, List<InstrumentResponse>> byArea = groupByArea(itemRepository.findAllWithInstrument(), live);

        List<AreaResponse> result = new ArrayList<>();
        for (SlopeArea area : areas) {
            List<InstrumentResponse> instruments = byArea.getOrDefault(area.getId(), List.of());
            LocalDateTime measuredAt = instruments.stream()
                    .map(InstrumentResponse::lastMeasuredAt)
                    .filter(java.util.Objects::nonNull)
                    .max(Comparator.naturalOrder()).orElse(null);
            result.add(new AreaResponse(
                    area.getId(), area.getName(), area.getAddress(), area.getLat(), area.getLng(),
                    area.getGrade(),
                    LevelName.of(LevelName.worse(zoneStates.get(area.getVendorId()), needed.get(area.getName()))),
                    measuredAt,
                    instruments));
        }
        return result;
    }

    // ------------------------------------------------------------------ 업체 최신값

    /**
     * 관측항목 하나의 최신 상태.
     *
     * @param level  업체 단계. 장애면 null
     * @param values 축(unitType) → 최신 행
     */
    private record ItemLive(String level, Map<String, VendorReading> values) {
    }

    /**
     * 업체 행(단위별 최근 2건)을 관측항목별 최신 상태로 접는다.
     *
     * <p><b>경사계 0,0,0 이상치를 건너뛴다.</b> 한 측정 시각의 3축이 모두 정확히 0 이면 그
     * 시각을 버리고 직전 시각을 쓴다. 센서 리셋·통신 오류로 시간당 6~8건 섞여 들어온다.
     */
    private Map<Long, ItemLive> latestByItem(List<VendorReading> rows) {
        Map<Long, List<VendorReading>> byItem = new HashMap<>();
        for (VendorReading r : rows) {
            byItem.computeIfAbsent(r.obsvItemId(), k -> new ArrayList<>()).add(r);
        }

        Map<Long, ItemLive> result = new HashMap<>();
        byItem.forEach((itemId, itemRows) -> {
            String crtcl = itemRows.get(0).crtclType();
            // 측정 시각 → 그 시각의 축별 행. 최신 시각부터 본다.
            TreeMap<LocalDateTime, Map<String, VendorReading>> byTime = new TreeMap<>(Comparator.reverseOrder());
            for (VendorReading r : itemRows) {
                if (r.msrDt() != null) {
                    byTime.computeIfAbsent(r.msrDt(), k -> new HashMap<>()).put(r.unitType(), r);
                }
            }
            Map<String, VendorReading> values = new HashMap<>();
            for (Map<String, VendorReading> atTime : byTime.values()) {
                if (isZeroOutlier(atTime)) {
                    continue;
                }
                atTime.forEach(values::putIfAbsent);   // 축마다 가장 최근 것 하나
            }
            result.put(itemId, new ItemLive(VendorLevel.isFault(crtcl) ? null : crtcl, values));
        });
        return result;
    }

    private boolean isZeroOutlier(Map<String, VendorReading> atTime) {
        return atTime.size() >= 3 && atTime.values().stream()
                .allMatch(r -> r.val() != null && r.val().compareTo(BigDecimal.ZERO) == 0);
    }

    // ------------------------------------------------------------------ 조립

    /**
     * 관측항목을 계측기로 접고, 계측기를 급경사지로 묶는다.
     *
     * <p>{@code items} 가 급경사지 → 종류 → 번호 순으로 정렬돼 오므로 {@link LinkedHashMap} 이
     * 그 순서를 유지한다. 화면이 다시 정렬할 필요가 없다.
     */
    private Map<Long, List<InstrumentResponse>> groupByArea(List<ObservationItem> items,
                                                            Map<Long, ItemLive> live) {
        Map<Long, List<ObservationItem>> byInstrument = new LinkedHashMap<>();
        for (ObservationItem item : items) {
            byInstrument.computeIfAbsent(item.getInstrument().getId(), k -> new ArrayList<>()).add(item);
        }

        Map<Long, List<InstrumentResponse>> byArea = new LinkedHashMap<>();
        for (List<ObservationItem> group : byInstrument.values()) {
            Instrument instrument = group.get(0).getInstrument();
            byArea.computeIfAbsent(instrument.getArea().getId(), k -> new ArrayList<>())
                    .add(toResponse(instrument, group, live));
        }
        return byArea;
    }

    private InstrumentResponse toResponse(Instrument instrument, List<ObservationItem> group,
                                          Map<Long, ItemLive> live) {
        List<InstrumentValue> instrumentValues = new ArrayList<>();
        String worstLevel = null;
        LocalDateTime latest = null;

        for (ObservationItem item : group) {
            ItemLive state = live.getOrDefault(item.getVendorId(), new ItemLive(null, Map.of()));
            worstLevel = LevelName.worse(worstLevel, state.level());
            // 축 순서는 ObservationCategory 가 정한다 — 화면이 이어붙이면 X축 / Y축 | 함수비 순.
            // U083(Z축)은 axes() 에 없어 담기지 않는다.
            for (ObservationCategory.Axis axis : item.getCategory().axes()) {
                VendorReading v = state.values().get(axis.unitType());
                if (v != null && (latest == null || v.msrDt().isAfter(latest))) {
                    latest = v.msrDt();
                }
                instrumentValues.add(new InstrumentValue(
                        item.getId(),
                        item.getCategory().name(), axis.unitType(), axis.label(),
                        v == null ? null : v.val(), item.getUnit(),
                        LevelName.of(state.level()),
                        v == null ? null : v.msrDt()));
            }
        }

        return new InstrumentResponse(
                instrument.getId(), instrument.getDisplayName(), instrument.getSourceName(),
                instrument.getCategory().name(), LevelName.of(worstLevel), latest,
                instrumentValues, instrument.getSpotNo(), instrument.getAddress(),
                instrument.getLat(), instrument.getLng(), instrument.getInstalledAt());
    }
}
