package com.eseict.ulsan.earthquake.realtime;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Stream;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 실시간 계측값 구독. 업체 스트림에 한 번 붙어 끊길 때까지 읽는다.
 *
 * <p><b>폴링이 아니다.</b> 요청/응답 반복이 아니라 연결을 유지하고 서버가 밀어주는 것을 받는다.
 * 관측소(NGG/NGT/NGV/NGB)가 한 연결에 섞여서 오므로 계측기별 요청을 하지 않는다.
 *
 * <p>{@code earthquake.realtime.enabled=false} 면 이 빈이 만들어지지 않아 외부에 붙지 않는다.
 *
 * <p>받은 값은 검증 후 {@link RealtimeStreamService} 로 화면에 밀어준다. DB 에는 저장하지 않는다.
 *
 * <p>전용 스레드에서 돈다 — 읽기가 무한정 블로킹되므로 톰캣/스케줄러 스레드를 쓰면 안 된다.
 * 끊기면 {@code reconnectDelay} 뒤 다시 붙는다.
 */
@Component
@ConditionalOnProperty(prefix = "earthquake.realtime", name = "enabled", havingValue = "true")
@Slf4j
public class RealtimeSubscriber {

    private static final TypeReference<List<RealtimeSample>> SAMPLE_LIST = new TypeReference<>() {
    };

    /** SSE 규격의 데이터 필드 접두사. 업체가 이 형식으로 보낸다 (2026-08-24 실데이터 확인). */
    private static final String SSE_DATA_PREFIX = "data:";

    private final RealtimeProperties properties;
    private final ObjectMapper objectMapper;
    private final RealtimeStreamService streamService;
    private final RealtimeStats stats;
    private final HttpClient httpClient;

    /** 관측소 간 값 중복 감지. 세는 것은 stats, 버릴지는 drop-duplicates 설정. 원인 확정되면 제거. */
    private final DuplicateValueDetector duplicateValueDetector = new DuplicateValueDetector();

    private volatile boolean running = true;
    private Thread thread;

    /** 연속 실패 시 로그가 넘치지 않도록, 끊김/파싱실패는 복구 전까지 한 번만 남긴다. */
    private boolean connectionFailing;

    /** 마지막 [CONTINUE] 로그 이후 화면으로 내보낸 건수. 구독 스레드가 늘리고 스케줄러가 비운다. */
    private final AtomicLong receivedSinceLastLog = new AtomicLong();
    private boolean parseFailing;

    public RealtimeSubscriber(RealtimeProperties properties,
                              ObjectMapper objectMapper,
                              RealtimeStreamService streamService,
                              RealtimeStats stats) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.streamService = streamService;
        this.stats = stats;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(properties.connectTimeout())
                .build();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void start() {
        thread = new Thread(this::subscribeForever, "realtime-subscriber");
        thread.setDaemon(true);
        thread.start();
    }

    @PreDestroy
    public void stop() {
        running = false;
        if (thread != null) {
            thread.interrupt();
        }
    }

    private void subscribeForever() {
        while (running) {
            try {
                subscribeOnce();
                // 스트림이 정상 종료된 경우 — 업체가 연결을 닫은 것이므로 다시 붙는다.
                onDisconnected("스트림이 종료됨");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            } catch (Exception e) {
                onDisconnected(e.toString());
            }
            if (!sleepBeforeReconnect()) {
                return;
            }
        }
    }

    private void subscribeOnce() throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(properties.url()))
                .GET()
                .header("Accept", "text/event-stream")
                // 요청 타임아웃을 걸지 않는다 — 끊기지 않는 스트림이라 정상 동작 중에 끊긴다.
                .build();

        HttpResponse<Stream<String>> response =
                httpClient.send(request, HttpResponse.BodyHandlers.ofLines());

        if (response.statusCode() != 200) {
            throw new IllegalStateException("스트림 응답코드 " + response.statusCode());
        }

        // 처음 붙을 때와 끊겼다 다시 붙을 때 모두 찍는다.
        log.info("[CONNECTED] \"{}\"에 연결되었습니다. 계측값을 읽어옵니다.", properties.url());
        connectionFailing = false;
        streamService.updateSourceConnected(true);

        try (Stream<String> lines = response.body()) {
            lines.takeWhile(line -> running).forEach(this::handleLine);
        }
    }

    /**
     * SSE 한 줄 처리.
     *
     * <pre>
     * data: [{"net":"US","obs":"NGT","time":"2026-08-24 09:41:14","hpga":0.042357188,...}]
     *                                      ← 이벤트 사이는 빈 줄
     * </pre>
     */
    private void handleLine(String rawLine) {
        String line = rawLine.trim();
        if (line.isEmpty() || line.startsWith(":")) {
            return;   // 빈 줄은 이벤트 구분자, ':' 로 시작하면 주석 (SSE 규격)
        }
        if (!line.startsWith(SSE_DATA_PREFIX)) {
            log.debug("data 가 아닌 SSE 필드 무시 — {}", line);   // event:/id:/retry:
            return;
        }
        String json = line.substring(SSE_DATA_PREFIX.length()).trim();
        try {
            List<RealtimeSample> samples = objectMapper.readValue(json, SAMPLE_LIST);
            samples.forEach(this::handleSample);
            parseFailing = false;
        } catch (Exception e) {
            // 형식이 예상과 다를 수 있다 (SSE 접두사 등). 실제로 온 원문을 한 번은 남겨서
            // 무엇이 오는지 확인할 수 있게 한다.
            if (!parseFailing) {
                log.warn("실시간 계측값 파싱 실패 — 원문: {}", rawLine, e);
                parseFailing = true;
            }
        }
    }

    /**
     * 샘플 한 건 처리 — 검증 → 중복 판정 → 화면 push.
     *
     * <p>여기를 통과한 값만 화면으로 나간다.
     */
    private void handleSample(RealtimeSample sample) {
        if (!isValid(sample)) {
            stats.countInvalid(sample);
            return;
        }

        String duplicateOf = duplicateValueDetector.findDuplicateOf(sample);
        if (duplicateOf != null) {
            stats.countDuplicated(duplicateOf, sample);
            if (properties.dropDuplicates()) {
                return;
            }
        }

        log.debug("수신 {}_{} {} hpga={} tpga={}{}",
                sample.net(), sample.obs(), sample.time(), sample.hpga(), sample.tpga(),
                duplicateOf != null ? " (중복)" : "");

        receivedSinceLastLog.incrementAndGet();
        streamService.broadcast(sample);
    }

    /**
     * 수신이 이어지고 있음을 주기적으로 남긴다 (기본 20초).
     *
     * <p>값이 1초마다 들어와 건마다 찍으면 로그가 넘친다. 그 사이 한 건도 안 들어왔으면 찍지
     * 않는다 — 로그에 [CONTINUE] 가 멈추면 값이 끊긴 것이다.
     */
    @Scheduled(fixedRateString = "${earthquake.realtime.continue-log-ms:20000}",
               initialDelayString = "${earthquake.realtime.continue-log-ms:20000}")
    public void logContinue() {
        if (receivedSinceLastLog.getAndSet(0) > 0) {
            log.info("[CONTINUE] 데이터가 계속 수신되고 있습니다.");
        }
    }

    /**
     * 명백히 쓸 수 없는 값을 걸러낸다. 최대가속도는 크기라서 음수가 될 수 없다.
     *
     * <p>시각 범위(너무 과거/미래)는 검사하지 않는다 — 업체 서버 시계 편차를 아직 모르는데
     * 임의의 허용폭을 정하면 멀쩡한 값을 버리게 된다.
     */
    private boolean isValid(RealtimeSample sample) {
        return sample.net() != null
                && sample.obs() != null
                && sample.time() != null
                && sample.hpga() != null && sample.hpga().signum() >= 0
                && sample.tpga() != null && sample.tpga().signum() >= 0;
    }

    /**
     * 끊김은 다시 붙을 때까지 한 번만 남긴다 — 업체 서버가 내려가 있으면 재연결 시도마다
     * 실패하므로, 매번 찍으면 5초마다 로그가 쌓인다. 원인은 DEBUG 로 본다.
     */
    private void onDisconnected(String reason) {
        streamService.updateSourceConnected(false);
        if (!connectionFailing) {
            log.warn("[DISCONNECTED] 연결이 끊어졌습니다. 다시 연결합니다.");
            connectionFailing = true;
        }
        log.debug("실시간 연결 끊김 원인 — {}", reason);
    }
    }

    /** @return 계속 진행해도 되면 true, 종료해야 하면 false */
    private boolean sleepBeforeReconnect() {
        try {
            Thread.sleep(properties.reconnectDelay().toMillis());
            return running;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }
}
