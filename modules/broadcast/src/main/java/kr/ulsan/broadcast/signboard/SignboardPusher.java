package kr.ulsan.broadcast.signboard;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.ulsan.broadcast.BroadcastProperties;
import kr.ulsan.broadcast.signboard.history.SignboardHistoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.function.Function;

/**
 * 전광판으로 알림을 보낸다. (모듈 → 전광판, {@code POST {push-url}})
 *
 * <p>전광판마다 주소가 따로라 <b>전광판 1대씩 따로</b> 보낸다. 새 알림 1건을 전광판 1대에 보낼 때:
 * <ol>
 *   <li>{@code [SIGNBOARD BOARD]} 현재 표출중인 알림이 있는지(DB 기준) 로그</li>
 *   <li>{@code [SIGNBOARD PUSH]} 새 알림 1건만 담아 전송 — 로그 + {@code signboard_push} + 시도별 {@code comm_log}</li>
 * </ol>
 * 전광판은 매번 받은 list 를 그 시점의 전체 목록으로 보므로, 새 알림만 보내면 기존 알림은 전광판이
 * 취소 처리한다(업체 답변: 최소 25초 유예 뒤 종료). 그래서 빈 목록을 먼저 보내지 않는다.
 * 만료도 전광판이 받은 시점부터 {@code displayDuration} 초 뒤 스스로 처리하므로 모듈은 만료 때 아무것도 보내지 않는다.
 * 빈 목록 전송({@link #clear})은 테스트 모드의 전광판 비우기에만 쓴다.
 *
 * <p>전송은 전광판별 단일 스레드에서 비동기로 처리한다 — 화면 응답을 붙잡지 않고, 같은 전광판으로의
 * 순서는 지켜지며, 한 전광판 장애가 다른 전광판 전송을 늦추지 않는다.
 *
 * <p>성공 판정은 HTTP 상태 기준이다: 2xx 면 성공(응답 Content-Type·본문 형식 무관).
 * 실패는 연결 오류·2xx 아님·명시적 {@code success:false} 뿐이며, 이때 2초 간격으로 {@value #MAX_RETRIES}번
 * 더 보낸다(최대 4번). 차단(blocked) 모드면 실제 전송 없이 로그와 {@code BLOCKED} 이력만 남긴다.
 */
@Component
public class SignboardPusher {

    private static final Logger log = LoggerFactory.getLogger(SignboardPusher.class);
    private static final int MAX_RETRIES = 3;
    private static final int MAX_ATTEMPTS = MAX_RETRIES + 1;
    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private static final DateTimeFormatter TS = DateTimeFormatter.ISO_OFFSET_DATE_TIME;
    private static final ObjectMapper PLAIN = new ObjectMapper();

    private final SignboardProperties properties;
    private final BroadcastProperties broadcast;
    private final SignboardHistoryService history;
    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final RestClient restClient;
    private final Function<String, Executor> executorFor;
    private final Duration retryDelay;

    @Autowired
    public SignboardPusher(SignboardProperties properties, BroadcastProperties broadcast,
                           SignboardHistoryService history, ObjectMapper objectMapper, Clock clock,
                           RestClient.Builder restClientBuilder) {
        this(properties, broadcast, history, objectMapper, clock,
                restClientBuilder.requestFactory(timeoutFactory()).build(),
                perHostExecutor(), Duration.ofSeconds(2));
    }

    SignboardPusher(SignboardProperties properties, BroadcastProperties broadcast,
                    SignboardHistoryService history, ObjectMapper objectMapper, Clock clock,
                    RestClient restClient, Function<String, Executor> executorFor, Duration retryDelay) {
        this.properties = properties;
        this.broadcast = broadcast;
        this.history = history;
        this.objectMapper = objectMapper;
        this.clock = clock;
        this.restClient = restClient;
        this.executorFor = executorFor;
        this.retryDelay = retryDelay;
    }

    /** 로그에 쓰는 전광판 이름: 주소의 첫 점 앞부분 (가상시설0208 → samhogyo). */
    static String boardName(String host) {
        int dot = host.indexOf('.');
        return dot < 0 ? host : host.substring(0, dot);
    }

    /** 새 알림을 대상 전광판마다 따로 보낸다(비동기). */
    public void push(Long alertId, EmergencyAlert alert, List<String> hosts) {
        for (String host : new LinkedHashSet<>(hosts)) {
            executorFor.apply(host).execute(() -> pushOne(alertId, alert, host));
        }
    }

    /** 지정 전광판들을 비운다(빈 목록 전송, 비동기). 테스트 모드 전용. 로그만 남기고 DB 에는 저장하지 않는다. */
    public void clear(List<String> hosts) {
        for (String host : new LinkedHashSet<>(hosts)) {
            executorFor.apply(host).execute(() -> clearOne(host));
        }
    }

    private void pushOne(Long alertId, EmergencyAlert alert, String host) {
        String name = boardName(host);
        if (history.isShowing(host)) {
            log.info("[SIGNBOARD BOARD] {} 현재 표출중인 알림이 있습니다. 취소 후 새로운 알림으로 교체합니다.", name);
        } else {
            log.info("[SIGNBOARD BOARD] {} 기존 표출 내용이 없습니다. 새로운 알림을 전송합니다.", name);
        }

        String what = alert.identifier() + " 전송";
        if (!broadcast.isOutputEnabled()) {
            log.info("[SIGNBOARD PUSH] {} {} (blocked, 전송 생략)", name, what);
            history.savePush(alertId, host, alert.identifier(), null, SignboardHistoryService.BLOCKED,
                    List.of(), "blocked 모드 — 전송 생략");
            return;
        }
        List<PushAttempt> attempts = send(host, List.of(alert), "[SIGNBOARD PUSH]", what);
        PushAttempt last = attempts.get(attempts.size() - 1);
        // 전광판은 받은 시점부터 displayDuration 초 동안 띄운다 → 성공한 경우만 표출 끝 시각을 남긴다.
        LocalDateTime displayUntil = last.success()
                ? LocalDateTime.now(clock).truncatedTo(ChronoUnit.SECONDS).plusSeconds(alert.displayDuration())
                : null;
        history.savePush(alertId, host, alert.identifier(), displayUntil,
                last.success() ? SignboardHistoryService.SUCCESS : SignboardHistoryService.FAILED,
                attempts, last.success() ? last.responseBody() : last.error());
    }

    private void clearOne(String host) {
        if (!broadcast.isOutputEnabled()) {
            log.info("[SIGNBOARD CLEAR] {} 초기화 (blocked, 전송 생략)", boardName(host));
            return;
        }
        send(host, List.of(), "[SIGNBOARD CLEAR]", "초기화");
    }

    /** 성공하거나 4번 다 실패할 때까지 보낸다. 시도마다 로그 1줄. 시도 목록을 돌려준다. */
    private List<PushAttempt> send(String host, List<EmergencyAlert> list, String tag, String what) {
        String name = boardName(host);
        String timestamp = OffsetDateTime.now(clock).truncatedTo(ChronoUnit.SECONDS).format(TS);
        String body = json(EmergencyAlertsResponse.of(timestamp, list));
        String url = UriComponentsBuilder.fromUriString(properties.getPushUrl())
                .buildAndExpand(Map.of("host", host, "port", properties.getPushPort()))
                .toUriString();

        List<PushAttempt> attempts = new ArrayList<>();
        for (int n = 1; n <= MAX_ATTEMPTS; n++) {
            if (n > 1 && !sleep()) {
                break;
            }
            PushAttempt at = sendOnce(url, body);
            attempts.add(at);
            if (at.success()) {
                log.info("{} {} {} (시도 {}/{}) 성공", tag, name, what, n, MAX_ATTEMPTS);
                break;
            }
            if (n < MAX_ATTEMPTS) {
                log.warn("{} {} {} (시도 {}/{}) 실패: {}", tag, name, what, n, MAX_ATTEMPTS, at.error());
            } else {
                log.error("{} {} {} (시도 {}/{}) 실패: {} 최종 실패", tag, name, what, n, MAX_ATTEMPTS, at.error());
            }
        }
        return attempts;
    }

    private PushAttempt sendOnce(String url, String body) {
        long start = System.nanoTime();
        try {
            // 2xx 가 아니면 예외 → 실패. 본문은 Content-Type 과 무관하게 문자열로 받는다.
            String response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("key", properties.getApiKey())
                    .body(body)
                    .retrieve()
                    .body(String.class);
            long ms = elapsed(start);
            PushResult result = parse(response);
            if (result != null && Boolean.FALSE.equals(result.success())) {
                return new PushAttempt(url, body, response, false, "전광판 거부: " + result.message(), ms);
            }
            return new PushAttempt(url, body, response, true, null, ms);
        } catch (Exception e) {
            return new PushAttempt(url, body, null, false, e.getMessage(), elapsed(start));
        }
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("전광판 전송 본문 직렬화 실패", e);
        }
    }

    private static long elapsed(long startNanos) {
        return (System.nanoTime() - startNanos) / 1_000_000;
    }

    /** 응답 본문을 JSON 으로 해석. 비었거나 JSON 이 아니면 null. */
    private static PushResult parse(String response) {
        if (response == null || response.isBlank()) {
            return null;
        }
        try {
            return PLAIN.readValue(response, PushResult.class);
        } catch (Exception e) {
            return null;
        }
    }

    private boolean sleep() {
        try {
            Thread.sleep(retryDelay.toMillis());
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    /** 타임아웃 + 본문 버퍼링(Content-Length 헤더로 전송, chunked 전송을 못 받는 전광판 대비). */
    private static ClientHttpRequestFactory timeoutFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(TIMEOUT);
        factory.setReadTimeout(TIMEOUT);
        return new BufferingClientHttpRequestFactory(factory);
    }

    private static Function<String, Executor> perHostExecutor() {
        Map<String, Executor> executors = new ConcurrentHashMap<>();
        return host -> executors.computeIfAbsent(host, h -> Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, "signboard-push-" + h);
            t.setDaemon(true);
            return t;
        }));
    }

    /** 전광판 응답. 정상 {@code {"success":true}}, key 불일치 {@code {"success":false,"message":"invalid api key"}}. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    record PushResult(Boolean success, String message) {
    }
}
