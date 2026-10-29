package com.eseict.ulsan.slope.facility;

import com.eseict.ulsan.slope.common.TtlCache;
import com.eseict.ulsan.slope.facility.dto.AreaResponse;
import java.time.Duration;
import java.util.List;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;

/**
 * {@code /api/areas}·{@code /api/areas/summary} 응답 캐시.
 *
 * <p><b>왜 필요한가</b> — 관제센터 20여 대가 각자 1분마다 같은 화면을 조회하는데, 이 응답은
 * <b>망연계 너머의 업체 DB</b>를 읽는다. 캐시를 두면 화면이 몇 대든 업체 조회는 분당 1회다.
 *
 * <p>TTL 1분은 업체 측정 주기·화면 폴링 주기와 같다. 요약도 같은 스냅샷에서 만들어, 상단 지역
 * 탭과 계측 상세가 서로 다른 시점 값을 보여주지 않는다.
 */
@Component
public class AreaSnapshotCache {

    private final TtlCache<String, List<AreaResponse>> cache = new TtlCache<>(Duration.ofMinutes(1));

    public List<AreaResponse> get(Supplier<List<AreaResponse>> loader) {
        return cache.get("areas", loader);
    }
}
