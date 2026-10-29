package com.eseict.ulsan.earthquake.realtime;

import com.eseict.ulsan.earthquake.realtime.dto.RealtimeResponse;
import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 실시간 계측값 화면 push (SSE). owl-web 의 상황전파 push 와 같은 구조다.
 *
 * <p>화면이 {@code GET /earthquake/api/realtime/stream} 으로 구독하면 emitter 를 등록해 두고,
 * 업체 스트림에서 값이 들어올 때마다 {@link #broadcast} 로 전체 구독자에게 보낸다.
 * 관측소 4대가 섞여 오므로 <b>받는 즉시 한 건씩</b> 내보낸다 — 모아서 보내면 지연이 생긴다.
 *
 * <p>구독자 목록은 순회(broadcast)가 구독/해지보다 훨씬 잦은 read-heavy 패턴이라
 * {@link CopyOnWriteArrayList} 를 쓴다.
 *
 * <p><b>업체 구독이 꺼져 있어도(`enabled=false`) 이 빈은 만들어진다.</b> 화면은 붙을 수 있고
 * 하트비트만 받는다 — 404 보다 낫다.
 *
 * <p><b>전송은 업체 스트림을 읽는 스레드에서 일어난다.</b> 구독자가 응답을 안 읽어 TCP 가 막히면
 * 그 스레드가 지연될 수 있다. 내부망에 화면 몇 대 규모라 지금은 이대로 두지만, 구독자가 늘거나
 * 지연이 관측되면 전송을 별도 스레드로 뺀다.
 */
@Service
@Slf4j
public class RealtimeStreamService {

    /** 무한 — 화면이 끊을 때까지 유지한다. */
    private static final long TIMEOUT = 0L;

    /** 화면의 EventSource 리스너 키. */
    private static final String EVENT_NAME = "earthquake-realtime";

    /** 업체 연결 상태 알림. 화면이 "조용한 것"과 "끊긴 것"을 구분하는 근거다. */
    private static final String STATUS_EVENT = "status";

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    /**
     * 업체 스트림에 붙어 있는지. 구독 스레드가 바꾸고 웹 요청 스레드가 읽는다.
     *
     * <p>기본 false — 아직 한 번도 못 붙었거나 {@code enabled=false} 인 상태를 "수신 안 됨"
     * 으로 정직하게 표시한다.
     */
    private volatile boolean sourceConnected;

    /**
     * 마지막으로 계측값을 화면에 내보낸 시각.
     *
     * <p>업체 연결이 살아 있어도 값이 안 오는 구간이 있다. 그때 화면이 "연결은 정상인데 값이
     * 없는 것" 과 "뭔가 잘못된 것" 을 구분하려면 <b>언제 마지막으로 값이 있었는지</b>가 필요하다.
     */
    private volatile LocalDateTime lastValueAt;

    /** 새 구독자 등록. 종료/타임아웃/에러 시 목록에서 제거. */
    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(TIMEOUT);
        emitters.add(emitter);

        emitter.onCompletion(() -> remove(emitter, "완료"));
        emitter.onTimeout(() -> remove(emitter, "타임아웃"));
        emitter.onError(e -> remove(emitter, "에러: " + e.getMessage()));

        // 구독 직후 1건을 보내 응답 헤더를 즉시 flush 한다.
        // 없으면 브라우저 EventSource 가 CONNECTING 에서 멈춘다.
        // 실제 데이터와 섞이지 않도록 event name 을 다르게 둔다.
        try {
            emitter.send(SseEmitter.event().name("connect").data("connected"));
            // 새로 붙은 화면은 지금 업체 수신이 되는 중인지 모른다. 현재 상태를 바로 알려준다.
            emitter.send(SseEmitter.event().name(STATUS_EVENT).data(status()));
        } catch (IOException e) {
            remove(emitter, "초기 전송 실패");
            return emitter;
        }
        logSubscriberChange("연결", emitters.size(), null);
        return emitter;
    }

    /**
     * 업체 연결 상태가 바뀌면 전체 구독자에게 알린다.
     *
     * <p>이게 없으면 화면은 "지진이 없어 조용한 것"과 "업체가 끊긴 것"을 구분할 수 없다 —
     * 둘 다 차트가 멈춘 모습으로 보인다.
     */
    public void updateSourceConnected(boolean connected) {
        if (sourceConnected == connected) {
            return;
        }
        sourceConnected = connected;
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(STATUS_EVENT).data(status()));
            } catch (IOException | IllegalStateException e) {
                remove(emitter, "상태 전송 실패");
            }
        }
    }

    /**
     * 화면에 내려주는 상태. {@code status} 와 {@code ping} 이 같은 내용을 쓴다.
     *
     * <p>{@code lastValueAt} 이 없으면 화면은 "값이 안 온다" 는 사실만 알 뿐 그것이 정상인지
     * 아닌지 판단할 수 없다. 연결 여부와 마지막 수신 시각을 함께 줘야 세 가지를 구분한다 —
     * 정상 수신 / 연결됐지만 값 없음 / 수신 중단.
     */
    private Map<String, Object> status() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("sourceConnected", sourceConnected);
        status.put("lastValueAt", lastValueAt);
        status.put("secondsSinceLastValue", lastValueAt == null
                ? null
                : Duration.between(lastValueAt, LocalDateTime.now()).toSeconds());
        return status;
    }

    /**
     * keep-alive. 값이 없는 동안에도 주기적으로 보내 (1) nginx/방화벽의 idle timeout 에
     * 끊기지 않게 하고, (2) 화면이 연결 생존을 판단할 수 있게 한다.
     *
     * <p>주석(`: ping`)이 아니라 named event 로 보낸다 — 브라우저 EventSource 는 주석을 무시한다.
     *
     * <p><b>내용이 상태다.</b> 값이 안 오는 동안에도 "연결은 살아 있고 마지막 값은 N초 전" 을
     * 알려줘야 화면이 끊긴 것처럼 보이지 않는다.
     */
    @Scheduled(fixedRateString = "${earthquake.realtime.heartbeat-ms:15000}")
    public void heartbeat() {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("ping").data(status()));
            } catch (IOException | IllegalStateException e) {
                remove(emitter, "keep-alive 실패");
            }
        }
    }

    /** 계측값 한 건을 전체 구독자에게. 전송 실패한 emitter 는 정리한다. */
    public void broadcast(RealtimeSample sample) {
        // 보는 화면이 없어도 기록한다 — "업체에서 값을 받고 있나" 는 구독자 유무와 무관하다.
        lastValueAt = LocalDateTime.now();

        if (emitters.isEmpty()) {
            return;
        }
        RealtimeResponse payload = RealtimeResponse.from(sample);
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(EVENT_NAME).data(payload));
            } catch (IOException | IllegalStateException e) {
                remove(emitter, "값 전송 실패");
            }
        }
    }

    /**
     * 하나의 emitter 가 {@code onError} 와 {@code onCompletion} 을 둘 다 부르는 경우가 있어,
     * 실제로 목록에서 빠진 경우에만 로그를 남긴다 — 안 그러면 끊김 1회에 로그가 2줄 나온다.
     */
    private void remove(SseEmitter emitter, String reason) {
        if (emitters.remove(emitter)) {
            logSubscriberChange("해제", emitters.size(), reason);
        }
    }

    /**
     * 구독자 수가 <b>0 을 넘나들 때만</b> INFO 로 남긴다.
     *
     * <p>화면이 새로고침되거나 EventSource 가 재연결할 때마다 붙었다 끊기므로, 전부 INFO 로
     * 남기면 로그가 이것으로 가득 찬다. 운영에서 의미 있는 것은 "보는 화면이 생겼다/없어졌다"
     * 뿐이고, 그 사이 오가는 것은 필요할 때 DEBUG 로 본다.
     */
    private void logSubscriberChange(String what, int count, String reason) {
        String detail = reason == null ? "" : " (" + reason + ")";
        if (count == 0) {
            log.info("[FRONT_DISCONNECTED] 연결된 화면이 없습니다.");
            log.debug("마지막 화면 해제 사유{}", detail);
        } else if (count == 1 && "연결".equals(what)) {
            log.info("[FRONT_CONNECTED] 화면과 정상적으로 연결됩니다.");
        } else {
            log.debug("실시간 화면 구독 {}{} — 구독자 {}명", what, detail, count);
        }
    }
}
