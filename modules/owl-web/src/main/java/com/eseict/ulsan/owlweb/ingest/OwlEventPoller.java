package com.eseict.ulsan.owlweb.ingest;

import com.eseict.ulsan.owlweb.ingest.dto.CollectedMessage;
import com.eseict.ulsan.owlweb.message.repository.MessageRepository;
import com.eseict.ulsan.owlweb.message.service.MessageSseService;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Component;

/**
 * 연계모듈(owl) 주기 폴링.
 *
 * <p>{@code owl.collect.poll-interval-ms} 주기로 owl 에 부엉이 메시지를 요청한다. owl 은
 * 5분마다 조회해 둔 최근 목록을 통째로 응답하고(중복 제거를 하지 않는다) 대부분은 이미 적재된
 * 건이므로, <b>받은 목록의 키를 한 번에 조회해 신규만 추려낸 뒤</b> 그 건들만 저장·push 한다.
 *
 * <p>저장은 건별 트랜잭션이라 한 건 실패가 나머지에 영향을 주지 않고, 커밋된 건만
 * SSE 로 나간다. owl 연결 실패는 처음 한 번만, 다시 붙으면 한 번만 로그를 남긴다.
 * {@code owl.collect.enabled=false} 면 비활성.
 *
 * <p>기동 점검 로그(StartupCheck) 뒤에 찍히도록 기동 완료 이벤트에서 폴링을 시작한다.
 */
@Component
@ConditionalOnProperty(name = "owl.collect.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class OwlEventPoller {

    private static final Logger log = LoggerFactory.getLogger(OwlEventPoller.class);

    private final OwlCollectClient client;
    private final EventIngestService ingestService;
    private final MessageRepository messageRepository;
    private final MessageSseService sseService;
    private final TaskScheduler taskScheduler;

    @Value("${owl.collect.poll-interval-ms}")
    private long intervalMs;

    /** owl 연결 상태. null = 아직 한 번도 안 물어봄. 바뀔 때만 로그를 남긴다. */
    private Boolean connected;

    @Order(Ordered.LOWEST_PRECEDENCE)
    @EventListener(ApplicationReadyEvent.class)
    public void start() {
        taskScheduler.scheduleWithFixedDelay(this::poll, Instant.now(), Duration.ofMillis(intervalMs));
    }

    /**
     * 받은 목록에서 아직 적재 안 된 건만 추린다.
     *
     * <p>키를 <b>한 번에</b> 조회해 거른다 — 건별로 조회하면 owl 응답 건수만큼 SELECT 가
     * 나가고 대부분은 "이미 있음" 확인만 하고 버려진다. 같은 {@code (msgId, msgSn)} 은
     * 내용도 같으므로 재수신 건은 갱신하지 않고 그냥 건너뛴다.
     */
    private List<CollectedMessage> newOnly(List<CollectedMessage> messages) {
        if (messages.isEmpty()) {
            return List.of();
        }
        Set<String> existing = messageRepository.findKeysByMsgIdIn(
                messages.stream().map(CollectedMessage::msgId).distinct().toList());
        return messages.stream()
                .filter(m -> !existing.contains(m.msgId() + "|" + m.msgSn()))
                .toList();
    }

    void poll() {
        List<CollectedMessage> received;
        try {
            received = client.fetch();
        } catch (Exception e) {
            if (!Boolean.FALSE.equals(connected)) {
                log.warn("[OWL] 수집서버에 연결할 수 없습니다 - {}", e.getMessage());
            }
            connected = false;
            return;
        }
        if (!Boolean.TRUE.equals(connected)) {
            log.info("[OWL] 수집서버에 연결되었습니다.");
        }
        connected = true;

        try {
            // 새 건이 없으면(빈 목록이거나 전부 이미 저장된 건) 아무것도 남기지 않는다.
            // owl 은 최근 목록을 매번 통째로 주므로 평소엔 이 경우다.
            List<CollectedMessage> fresh = newOnly(received);
            if (fresh.isEmpty()) {
                return;
            }

            // 새 건이 있을 때만 수신 → New → Save 3단계를 남긴다. 단계별 숫자가 벌어지면
            // 어디서 빠졌는지가 드러난다 (수신>New = 재수신분, New>Save = 저장 실패).
            log.info("부엉이 이벤트 수신 - {}건", received.size());
            log.info("부엉이 이벤트 New - {}건", fresh.size());

            int saved = 0;
            for (CollectedMessage m : fresh) {
                try {
                    sseService.broadcast(ingestService.insert(m));
                    saved++;
                } catch (Exception e) {
                    // 한 건 실패가 나머지 처리에 영향 주지 않도록 건별로 격리.
                    // 판별~저장 사이 경합으로 UNIQUE 제약에 걸린 경우도 여기로 온다.
                    log.warn("Failed to process event msgId={} msgSn={} : {}",
                            m.msgId(), m.msgSn(), e.getMessage());
                }
            }
            log.info("부엉이 이벤트 Save - {}건", saved);
        } catch (Exception e) {
            log.warn("부엉이 이벤트 처리 실패: {}", e.getMessage());
        }
    }
}
