package com.eseict.ulsan.slope.chart;

import com.eseict.ulsan.slope.chart.dto.ChartThreshold;
import com.eseict.ulsan.slope.common.TtlCache;
import com.eseict.ulsan.slope.facility.LevelName;
import com.eseict.ulsan.slope.ingest.VendorReader;
import com.eseict.ulsan.slope.ingest.dto.VendorThreshold;
import java.time.Duration;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 임계값 조회. <b>업체 기준표를 직접 읽는다</b> ({@link VendorReader#readThresholds()}).
 *
 * <p>기준표는 거의 바뀌지 않아 전건(약 600행)을 1시간 캐시하고 여기서 거른다.
 *
 * <p><b>강우량만 창을 골라야 한다.</b> 한 단계에 15분·60분·1일·2일 네 값이 있고, 차트 탭의
 * 집계 단위와 같은 것을 써야 비교가 성립한다 ({@link ChartRange#rainWindow()}).
 * 그 외 센서는 창이 없어 {@code '-'} 한 벌뿐이다.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "slope.vendor.enabled", havingValue = "true")
public class ThresholdReader {

    private final VendorReader vendorReader;
    private final TtlCache<String, List<VendorThreshold>> cache = new TtlCache<>(Duration.ofHours(1));

    /**
     * @param vendorItemId 업체 관측항목 id
     * @param timeWindow   강우량이면 {@code ChartRange.rainWindow()}, 그 외 센서는 {@code "-"}.
     *                     null 이면 대응하는 창이 없다는 뜻이라 빈 목록을 준다 (월 탭의 강우량)
     */
    public List<ChartThreshold> read(Long vendorItemId, String unitType, String timeWindow) {
        if (timeWindow == null) {
            return List.of();
        }
        // 한 단계에 행이 여럿이면 뒤의 것을 쓴다 — 기존 적재(ON CONFLICT 덮어쓰기)와 같은 결과.
        Map<String, VendorThreshold> byLevel = new LinkedHashMap<>();
        for (VendorThreshold t : cache.get("all", vendorReader::readThresholds)) {
            if (t.obsvItemId().equals(vendorItemId) && t.unitType().equals(unitType)
                    && t.timeWindow().equals(timeWindow) && t.value() != null) {
                byLevel.put(t.level(), t);
            }
        }
        return byLevel.values().stream()
                .sorted(Comparator.comparing(VendorThreshold::value))
                .map(t -> new ChartThreshold(LevelName.of(t.level()), t.value()))
                .toList();
    }
}
