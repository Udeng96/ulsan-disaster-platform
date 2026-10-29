package com.eseict.ulsan.slope.facility;

import com.eseict.ulsan.slope.facility.dto.AreaResponse;
import com.eseict.ulsan.slope.facility.dto.AreaSummaryResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 급경사지 + 계측기 조회. {@code /slope} 는 context-path.
 *
 * <p>{@code GET /slope/api/areas}         — 급경사지 3곳과 소속 계측기 전건 (약 30KB)
 * <p>{@code GET /slope/api/areas/summary} — 배지용 요약. 이름·등급·상태만 (약 200B)
 *
 * <p><b>화면은 둘 중 하나만 1분마다 부르면 된다.</b> 계측 상세 화면은 전체를, 나머지 화면은
 * 요약을 쓴다 — 요약 바가 3탭 공통이라 어디서든 갱신은 필요하지만 계측기 목록은 그 화면에서만
 * 쓰인다.
 *
 * <p>계측 상세 화면이 이 하나로 그려진다 — 왼쪽 지도 마커, 가운데 목록, 오른쪽 상세의
 * 메타 정보까지. 필터·선택·정렬은 화면에서 한다.
 *
 * <p><b>화면은 1분마다 이 경로를 부르면 된다.</b> 관제센터 20여 대가 동시에 불러도 응답이
 * 캐시되어 업체 DB 조회는 분당 1회로 고정된다 ({@link AreaSnapshotCache}). 요약도 같은
 * 스냅샷에서 만든다. SSE 를 두지 않은 이유는
 * 전체 지연에서 차지하는 몫이 작아서다 — 업체가 측정값을 저장하는 데만 60초가 걸려
 * (실측 {@code rgs_dt - msr_dt}), 화면 전달 구간을 줄여도 평균 2분이 1분 30초가 될 뿐이다.
 *
 * <p><b>관리지역</b>({@link ManagedArea}, {@code /api/managed-areas})과 별개 자원이다.
 * 같은 장소를 가리키는 3건이 양쪽에 있지만 이름도 각자 관리한다.
 */
@RestController
@RequestMapping("/api/areas")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "slope.vendor.enabled", havingValue = "true")
public class SlopeAreaController {

    private final SlopeAreaService service;
    private final AreaSnapshotCache cache;

    @GetMapping
    public List<AreaResponse> list() {
        return cache.get(service::list);
    }

    @GetMapping("/summary")
    public List<AreaSummaryResponse> summary() {
        return SlopeAreaService.summarize(cache.get(service::list));
    }
}
