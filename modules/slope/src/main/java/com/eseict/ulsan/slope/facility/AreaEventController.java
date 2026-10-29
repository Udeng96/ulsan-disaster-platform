package com.eseict.ulsan.slope.facility;

import com.eseict.ulsan.slope.facility.dto.AreaEventResponse;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 급경사지 이벤트 이력. {@code /slope} 는 context-path.
 *
 * <p>{@code GET /slope/api/area-events?from=&to=&areaId=&eventType=}
 *
 * <p>단계가 바뀔 때마다의 이력이다 — <b>발령 여부와 무관하게</b> 올라가도 내려가도 정상이 돼도 남는다.
 * 단계는 상단 지역 탭과 같다(지구 상태와 발령 필요 중 높은 것). 발령 이력과 같은 테이블을 읽는다.
 *
 * <p>검색은 우리 DB 에서 하므로 업체 조회가 없고 빠르다.
 */
@RestController
@RequestMapping("/api/area-events")
@RequiredArgsConstructor
public class AreaEventController {

    private final AreaEventService service;

    @GetMapping
    public List<AreaEventResponse> search(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long areaId,
            @RequestParam(required = false) String eventType) {
        return service.search(from, to, areaId, eventType);
    }
}
