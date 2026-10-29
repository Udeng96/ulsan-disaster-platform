package com.eseict.ulsan.owlweb.message.service;

import com.eseict.ulsan.owlweb.message.dto.MessageResponse;
import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 신규 상황전파 메시지 실시간 push (SSE).
 *
 * <p>대시보드가 {@code GET /owl/events/stream} 으로 구독하면 emitter 를 등록해 두고,
 * 폴링으로 신규 메시지가 적재될 때 {@link #broadcast} 로 전체 구독자에게 전송한다.
 *
 * <p>구독자 목록은 동시 순회/변경 안전하도록 {@link CopyOnWriteArrayList} 사용
 * (구독/해지보다 순회(broadcast)가 훨씬 잦은 read-heavy 패턴).
 */
@Service
public class MessageSseService {

    private static final Logger log = LoggerFactory.getLogger(MessageSseService.class);

    /** SSE 기본 타임아웃 — 무한(브라우저가 끊을 때까지 유지). */
    private static final long TIMEOUT = 0L;

    /** SSE 이벤트 이름 — 프론트 EventSource 리스너 키. */
    private static final String EVENT_NAME = "owl-message";

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    /** 새 구독자 등록. 종료/타임아웃/에러 시 목록에서 제거. */
    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(TIMEOUT);
        emitters.add(emitter);
        emitter.onCompletion(() -> {
            emitters.remove(emitter);
            log.info("SSE Disconnected (subscribers={})", emitters.size());
        });
        emitter.onTimeout(() -> {
            emitters.remove(emitter);
            log.info("SSE Disconnected (timeout, subscribers={})", emitters.size());
        });
        emitter.onError(e -> {
            emitters.remove(emitter);
            log.info("SSE Disconnected (error: {}, subscribers={})", e.getMessage(), emitters.size());
        });
        // 구독 직후 1건 전송 → 응답 헤더 즉시 flush (없으면 EventSource 가 CONNECTING 에서 멈춤).
        // event name 을 owl-message 와 다른 "connect" 로 둬서 실제 이벤트 리스너와 섞이지 않게 한다.
        try {
            emitter.send(SseEmitter.event().name("connect").data("connected"));
        } catch (IOException e) {
            emitters.remove(emitter);
        }
        log.info("SSE Connected (subscribers={})", emitters.size());
        return emitter;
    }

    /**
     * keep-alive heartbeat — 주기적으로 {@code ping} 이벤트를 보내 (1) idle 연결이
     * 프록시/방화벽 idle timeout 에 끊기지 않게 유지하고, (2) 클라이언트가 이 ping 수신으로
     * 연결 생존을 판단(watchdog)할 수 있게 한다. 주석(: ping)이 아니라 named event 로 보내야
     * 브라우저 EventSource 가 감지 가능(주석은 무시됨). 전송 실패한 emitter 는 정리(reaping).
     */
    @Scheduled(fixedRateString = "${owl.sse.heartbeat-ms:15000}")
    public void heartbeat() {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("ping").data("keep-alive"));
            } catch (IOException | IllegalStateException e) {
                emitters.remove(emitter);
            }
        }
    }

    /** 신규 메시지를 모든 구독자에게 전송. 전송 실패한 emitter 는 정리. 전달 성공 시 로그. */
    public void broadcast(MessageResponse message) {
        int sent = 0;
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(EVENT_NAME).data(message));
                sent++;
            } catch (IOException | IllegalStateException e) {
                emitters.remove(emitter);
            }
        }
        if (sent > 0) {
            log.info("Success Send Event : id={} msgId={}", message.id(), message.msgId());
        }
    }
}
