package kr.ulsan.broadcast.voice;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 통신 차단(mock) 게이트웨이.
 *
 * <p>{@code broadcast.mode=blocked}(기본) 일 때 등록된다. 실제 TCP 전송을 하지 않고
 * 성공 결과를 반환한다(로그·DB 로만 확인, 이력은 BLOCKED). REAL/TEST 모드에서는
 * {@link VoiceClient}가 대신 뜬다.
 */
@Component
@ConditionalOnExpression("'${broadcast.mode:blocked}'.equalsIgnoreCase('blocked')")
public class MockVoiceGateway implements VoiceGateway {

    private static final Logger log = LoggerFactory.getLogger(MockVoiceGateway.class);
    static final String MESSAGE = "(blocked, 전송 생략)";

    @Override
    public VoiceCastResult cast(String title, String content, String alertSound, List<VoiceTarget> targets) {
        log.info("[VOICE RESULT] {}", MESSAGE);
        return new VoiceCastResult(true, null, MESSAGE,
                new VoiceExchange("mock", "EXP REQST TERM TTS CAST", null, null, 0, null), true);
    }
}
