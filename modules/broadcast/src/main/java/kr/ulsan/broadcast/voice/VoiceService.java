package kr.ulsan.broadcast.voice;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.ulsan.broadcast.voice.history.VoiceHistoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 자동음성 공통 진입점 (화면·CAP·테스트).
 *
 * <p>요청·응답을 {@code [VOICE RECEIVE]}/{@code [VOICE CONTENT]}/{@code [VOICE RESPONSE]}로 남기고
 * ({@code [VOICE RESULT]}는 게이트웨이가 남김), 업체 응답(또는 통신 실패) 뒤 이력·통신 로그를 DB 에 저장한다.
 * 저장이 실패해도 방송 응답은 그대로 돌려준다. 필수값 검사는 화면에서 하므로 여기서는 하지 않는다.
 */
@Service
public class VoiceService {

    private static final Logger log = LoggerFactory.getLogger(VoiceService.class);

    private final VoiceGateway gateway;
    private final VoiceHistoryService history;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public VoiceService(VoiceGateway gateway, VoiceHistoryService history, ObjectMapper objectMapper,
                        Clock clock) {
        this.gateway = gateway;
        this.history = history;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    /** 방송 실행. 업체 통신 실패면 {@link VoiceException}을 그대로 던진다(→ 502). */
    public VoiceCastResult cast(VoiceSource source, String title, String content,
                                String alertSound, List<VoiceTarget> targets) {
        LocalDateTime requestedAt = LocalDateTime.now(clock);
        List<VoiceTarget> safeTargets = targets == null ? List.of() : targets;
        log.info("[VOICE RECEIVE] 음성통보 요청이 들어왔습니다.");
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("title", title);
        request.put("content", content);
        request.put("alertSound", alertSound);
        request.put("targets", safeTargets);
        log.info("[VOICE CONTENT] {}", json(request));

        try {
            VoiceCastResult result = gateway.cast(title, content, alertSound, safeTargets);
            history.saveCast(source, title, content, alertSound, safeTargets, result, requestedAt);
            log.info("[VOICE RESPONSE] {}", responseLine(result));
            return result;
        } catch (VoiceException e) {
            history.saveFailedCast(source, title, content, alertSound, safeTargets, e, requestedAt);
            log.warn("[VOICE RESPONSE] FAIL {}", e.getMessage());
            throw e;
        }
    }

    /** SUCCESS (CAST ID: …) / SUCCESS (blocked, 전송 생략) / FAIL 업체 거부: … */
    private static String responseLine(VoiceCastResult result) {
        if (result.blocked()) {
            return "SUCCESS " + result.resultMessage();
        }
        if (result.accepted()) {
            return "SUCCESS (CAST ID: " + result.castId() + ")";
        }
        return "FAIL 업체 거부: " + result.resultMessage();
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return String.valueOf(value);
        }
    }
}
