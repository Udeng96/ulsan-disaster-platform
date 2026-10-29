package com.eseict.ulsan.earthquake.event;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 업체 DB({@code accdb}) 이벤트 뷰 조회. {@code /earthquake} 는 context-path.
 *
 * <p>{@code GET /earthquake/api/events/source} — {@code v_evt_all} 최근 이벤트.
 * {@code ?type=K}(기상청 통보) / {@code ?type=H}(현장 트리거) 로 거를 수 있다.
 *
 * <p>업체 DB 를 그대로 읽어 내려준다. 폐쇄망이라 DB 클라이언트로 붙기 어려울 때, 배포한
 * 모듈을 통해 확인하려는 용도다. <b>읽기 전용</b>이다.
 *
 * <p>우리 DB 에 적재된 것을 보려면 이 경로가 아니라 별도 조회 API 가 필요하다(미구현).
 *
 * <p>{@code earthquake.event.polling=false} 면 업체 DB 빈이 없으므로 이 컨트롤러도 만들어지지
 * 않는다.
 */
@RestController
@RequestMapping("/api/events")
@ConditionalOnProperty(prefix = "earthquake.event", name = "polling", havingValue = "true")
@RequiredArgsConstructor
public class EventSourceController {

    /** 한 번에 너무 많이 끌어오지 않도록 상한을 둔다. */
    private static final int MAX_LIMIT = 1000;
    private static final int DEFAULT_LIMIT = 100;

    private final EventReader reader;

    @GetMapping("/source")
    public List<EventRow> source(
            @RequestParam(required = false) String type,
            @RequestParam(required = false, defaultValue = "" + DEFAULT_LIMIT) int limit) {
        int capped = clamp(limit);
        return type == null || type.isBlank()
                ? reader.findRecent(capped)
                : reader.findRecentByType(type, capped);
    }

    private static int clamp(int limit) {
        return Math.max(1, Math.min(limit, MAX_LIMIT));
    }
}
