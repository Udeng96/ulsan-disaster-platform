package kr.ulsan.broadcast.signboard;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.ulsan.broadcast.signboard.board.SignboardBoardRepository;
import kr.ulsan.broadcast.signboard.history.SignboardHistoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * 전광판 알림 공통 진입점 (화면·CAP).
 *
 * <p>요청을 {@code [SIGNBOARD RECEIVE]}/{@code [SIGNBOARD CONTENT]}로 남기고, 화면이 보낸 내용·대상에
 * 나머지 전광판 규격 값을 채워({@code broadcast.signboard.alert.*}) {@code signboard_alert} 에 저장한 뒤,
 * {@code [SIGNBOARD RESPONSE]}를 남기고 응답한다. 전광판 전송은 응답 뒤 비동기로 나간다({@link SignboardPusher}).
 * 저장이 실패해도 전송과 응답은 그대로 진행한다.
 */
@Service
public class SignboardService {

    private static final Logger log = LoggerFactory.getLogger(SignboardService.class);
    private static final DateTimeFormatter IDENTIFIER_TS = DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");
    private static final DateTimeFormatter DISPLAY_TS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final SignboardPusher pusher;
    private final SignboardHistoryService history;
    private final SignboardProperties properties;
    private final SignboardBoardRepository boards;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public SignboardService(SignboardPusher pusher, SignboardHistoryService history, SignboardProperties properties,
                            SignboardBoardRepository boards, ObjectMapper objectMapper, Clock clock) {
        this.pusher = pusher;
        this.history = history;
        this.properties = properties;
        this.boards = boards;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    /** 새 알림 등록. 대상 전광판마다 새 알림을 보낸다(기존 표출은 전광판이 취소 처리). */
    public SignboardResponse register(SignboardSource source, SignboardAlertRequest request) {
        logRequest(objectMapper, request);
        LocalDateTime now = LocalDateTime.now(clock).truncatedTo(ChronoUnit.MILLIS);
        LocalDateTime expiresAt = now.plusMinutes(properties.getAlert().getExpiresMinutes())
                .truncatedTo(ChronoUnit.SECONDS);
        EmergencyAlert alert = newAlert(request, now, expiresAt);
        Long alertId = history.saveAlert(source, alert, expiresAt, now);

        List<String> targets = targetsOf(request.targetHosts());
        SignboardResponse response = SignboardResponse.success(
                targets.stream().map(host -> host + " : " + alert.identifier()).toList());
        log.info("[SIGNBOARD RESPONSE] SUCCESS");
        pusher.push(alertId, alert, targets);
        return response;
    }

    /** 알림의 대상 전광판. {@code targetHosts} 가 없으면 전광판 목록({@code signboard_board})에서 host 가 있는 전체. */
    private List<String> targetsOf(List<String> targetHosts) {
        return (targetHosts == null || targetHosts.isEmpty()) ? boards.findHosts() : targetHosts;
    }

    /** 화면 요청 + 설정값 → 전광판 규격 알림. identifier 는 요청 시각(밀리초까지)으로 매번 새로 만든다. */
    private EmergencyAlert newAlert(SignboardAlertRequest request, LocalDateTime now, LocalDateTime expiresAt) {
        SignboardProperties.Alert a = properties.getAlert();
        return new EmergencyAlert(
                a.getIdentifierPrefix() + now.format(IDENTIFIER_TS),
                request.msgCn(),
                a.getDisplayDuration(),
                a.getSubType(),
                a.getPriority(),
                a.getRcptnRgnNm(),
                a.getAgency(),
                now.format(DISPLAY_TS),
                expiresAt.format(DISPLAY_TS),
                request.targetHosts());
    }

    /** {@code [SIGNBOARD RECEIVE]}·{@code [SIGNBOARD CONTENT]}. 검증 실패 응답에서도 쓴다. */
    static void logRequest(ObjectMapper objectMapper, Object alert) {
        log.info("[SIGNBOARD RECEIVE] 전광판 알림 요청이 들어왔습니다.");
        String content;
        try {
            content = objectMapper.writeValueAsString(alert);
        } catch (Exception e) {
            content = String.valueOf(alert);
        }
        log.info("[SIGNBOARD CONTENT] {}", content);
    }
}
