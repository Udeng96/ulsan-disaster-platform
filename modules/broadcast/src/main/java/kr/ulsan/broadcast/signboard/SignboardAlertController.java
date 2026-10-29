package kr.ulsan.broadcast.signboard;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 화면(대시보드)이 전광판 알림을 보내는 API. 요청 1건 = 알림 1건.
 *
 * <p>응답은 알림을 보낼 전광판 목록({@code "<전광판> : <alert id>"})이다. 전광판 전송 결과는 응답 뒤
 * 비동기로 나가므로 응답에는 없고, 로그({@code signboard.log})와 DB({@code signboard_push})에 남는다.
 */
@RestController
@RequestMapping("/internal/signboard/alerts")
public class SignboardAlertController {

    private final SignboardService service;

    public SignboardAlertController(SignboardService service) {
        this.service = service;
    }

    @PostMapping
    public SignboardResponse register(@Valid @RequestBody SignboardAlertRequest alert) {
        return service.register(SignboardSource.SCREEN, alert);
    }
}
