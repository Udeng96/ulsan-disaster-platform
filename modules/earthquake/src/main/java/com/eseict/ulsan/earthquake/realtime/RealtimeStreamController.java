package com.eseict.ulsan.earthquake.realtime;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 실시간 계측값 구독. {@code /earthquake} 는 context-path.
 *
 * <p>{@code GET /earthquake/api/realtime/stream} — SSE 구독
 *
 * <p>이벤트 이름은 두 가지다.
 * <ul>
 *   <li>{@code earthquake-realtime} — 계측값 한 건 (차트에 점 하나)
 *   <li>{@code ping} — keep-alive. 화면은 무시하거나 연결 생존 판단에 쓴다.
 * </ul>
 *
 * <p>과거 구간은 내려주지 않는다 — 화면은 접속 시점부터 채워나간다 (사용자 확정).
 */
@RestController
@RequestMapping("/api/realtime")
@RequiredArgsConstructor
public class RealtimeStreamController {

    private final RealtimeStreamService service;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        return service.subscribe();
    }
}
