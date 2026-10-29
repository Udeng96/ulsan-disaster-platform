package kr.ulsan.broadcast.signboard;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * <b>테스트 모드({@code broadcast.mode=test}) 전용.</b> 전광판 비우기.
 *
 * <p>지정 전광판에 빈 목록({@code count:0, list:[]})을 보내 떠 있는 알림을 바로 내린다.
 * 로그({@code [SIGNBOARD CLEAR]})만 남기고 DB 에는 저장하지 않는다.
 * 알림 보내기 테스트는 실제 API({@code POST /internal/signboard/alerts})에 직접 보낸다(docs/signboard-curl-test.md).
 */
@RestController
@ConditionalOnExpression("'${broadcast.mode:blocked}'.equalsIgnoreCase('test')")
public class SignboardTestController {

    private static final Logger log = LoggerFactory.getLogger(SignboardTestController.class);

    private final SignboardPusher pusher;

    public SignboardTestController(SignboardPusher pusher) {
        this.pusher = pusher;
    }

    @PostMapping("/test/signboard/clear")
    public List<String> clear(@Valid @RequestBody ClearRequest request) {
        log.info("[SIGNBOARD RECEIVE] 전광판 초기화 요청이 들어왔습니다. 대상: {}", request.targetHosts());
        pusher.clear(request.targetHosts());
        return request.targetHosts();
    }

    /** 초기화 요청 본문 — 빈 목록을 보낼 전광판. */
    public record ClearRequest(@NotEmpty List<String> targetHosts) {
    }
}
