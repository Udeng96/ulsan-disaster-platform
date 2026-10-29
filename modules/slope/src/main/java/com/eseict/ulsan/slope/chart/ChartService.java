package com.eseict.ulsan.slope.chart;

import com.eseict.ulsan.slope.chart.dto.ChartPoint;
import com.eseict.ulsan.slope.chart.dto.ChartResponse;
import com.eseict.ulsan.slope.chart.dto.ChartSeries;
import com.eseict.ulsan.slope.chart.dto.ChartThreshold;
import com.eseict.ulsan.slope.common.TtlCache;
import com.eseict.ulsan.slope.facility.ObservationCategory;
import com.eseict.ulsan.slope.facility.ObservationItem;
import com.eseict.ulsan.slope.facility.ObservationItemRepository;
import com.eseict.ulsan.slope.ingest.dto.VendorThreshold;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 차트 조회.
 *
 * <p><b>데이터도 임계값도 전부 업체 DB 에서 읽는다</b> (2026-09-30 사용자 결정). 우리 DB 에서는
 * 화면이 넘긴 관측항목 id 를 업체 id 로 바꾸는 데만 쓴다.
 *
 * <p><b>응답을 탭별로 캐시한다</b> — 업체 DB 가 망연계 너머라, 같은 센서를 여러 화면이 열어도
 * 업체 조회는 캐시 주기당 1회다. 주기는 값이 바뀌는 속도에 맞췄다 (실시간 1분 ~ 월 1시간).
 *
 * <p>경사계는 선이 2개(X축·Y축) 나온다. 업체 판정이 두 축을 함께 보므로 X 만 그리면 차트는
 * 임계선 아래인데 뱃지는 관심인 계측기가 생긴다 — 실제로 그런 계측기가 있었다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@ConditionalOnProperty(name = "slope.vendor.enabled", havingValue = "true")
public class ChartService {

    private final ObservationItemRepository itemRepository;
    private final ChartReader reader;
    private final ThresholdReader thresholdReader;

    private final Map<ChartRange, TtlCache<Long, ChartResponse>> caches = Map.of(
            ChartRange.REALTIME, new TtlCache<>(Duration.ofMinutes(1)),
            ChartRange.HOUR, new TtlCache<>(Duration.ofMinutes(5)),
            ChartRange.DAY, new TtlCache<>(Duration.ofMinutes(30)),
            ChartRange.MONTH, new TtlCache<>(Duration.ofHours(1)));

    public ChartResponse chart(Long observationItemId, ChartRange range) {
        ObservationItem item = itemRepository.findById(observationItemId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "관측항목을 찾을 수 없습니다: " + observationItemId));
        return caches.get(range).get(observationItemId, () -> load(item, range));
    }

    private ChartResponse load(ObservationItem item, ChartRange range) {
        ObservationCategory category = item.getCategory();
        Long vendorId = item.getVendorId();
        LocalDateTime from = range.from(LocalDateTime.now());

        List<ChartSeries> series = new ArrayList<>();
        List<ChartThreshold> thresholds = List.of();

        for (ObservationCategory.Axis axis : category.axes()) {
            series.add(new ChartSeries(axis.unitType(), labelFor(axis, category, range), category.bar(),
                    points(vendorId, axis.unitType(), category, range, from)));

            // X·Y 임계값이 동일한 것을 확인했다(0.3/0.6/0.9/1.7). 한 벌만 읽는다.
            if (thresholds.isEmpty()) {
                thresholds = thresholdReader.read(vendorId, axis.unitType(), windowFor(category, range));
            }
        }

        if (isRainRealtime(category, range)) {
            appendRainRolling(item, series, from);
        }

        return new ChartResponse(
                item.getId(), category.name(), item.getUnit(),
                range.name().toLowerCase(), thresholds, series);
    }

    private List<ChartPoint> points(Long vendorId, String unitType, ObservationCategory category,
                                    ChartRange range, LocalDateTime from) {
        if (range.isRealtime()) {
            return reader.readRealtime(vendorId, unitType, category, from);
        }
        if (range == ChartRange.MONTH) {
            return reader.readMonthly(vendorId, unitType, category, from);
        }
        return reader.readAggregated(vendorId, unitType, category, range.bucketType(), from);
    }

    /**
     * 강우량 실시간에만 <b>15분 이동합 선</b>을 하나 더 붙인다.
     *
     * <p>5분 합계 막대는 임계값과 단위가 달라 비교할 수 없다 — 실측 5분 합계 최대가 3mm 인데
     * 가장 낮은 임계값이 4mm 다. 같은 단위의 선을 그려야 "지금 임계에 얼마나 가까운가" 가
     * 보인다. 임계선은 이 선을 기준으로 읽는다.
     *
     * <p>순서는 [막대, 선] 으로 고정한다 — 화면이 순서로 구분한다.
     */
    private void appendRainRolling(ObservationItem item, List<ChartSeries> series, LocalDateTime from) {
        String unitType = ObservationCategory.RAIN_GAUGE.axes().get(0).unitType();
        series.add(new ChartSeries(unitType, "15분 누적", false,
                reader.readRainRolling(item.getVendorId(), unitType, from)));
    }

    /**
     * 시리즈 이름.
     *
     * <p>강우량 실시간에서만 막대를 "5분 강우량" 으로 부른다. 옆에 "15분 누적" 선이 함께
     * 오는데 둘 다 "강우량" 이면 <b>단위가 다르다는 것이 범례에서 드러나지 않는다</b> —
     * 막대를 임계선과 비교해 "한참 아래니 안전하다" 고 읽을 수 있다.
     *
     * <p>다른 탭은 막대 하나뿐이라 구간을 붙일 이유가 없다.
     */
    private String labelFor(ObservationCategory.Axis axis, ObservationCategory category, ChartRange range) {
        return isRainRealtime(category, range) ? "5분 강우량" : axis.label();
    }

    private boolean isRainRealtime(ObservationCategory category, ChartRange range) {
        return category == ObservationCategory.RAIN_GAUGE && range.isRealtime();
    }

    /**
     * 임계값을 고를 창.
     *
     * <p>강우량만 한 단계에 값이 4개다. 차트 탭의 집계 단위와 같은 창을 써야 비교가 성립한다.
     * 실시간은 5분 버킷이지만 15분 이동합 선에 임계선을 걸므로 15분 창을 쓴다.
     */
    private String windowFor(ObservationCategory category, ChartRange range) {
        return category == ObservationCategory.RAIN_GAUGE
                ? range.rainWindow()
                : VendorThreshold.NO_WINDOW;
    }
}
