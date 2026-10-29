package kr.ulsan.broadcast.dashboard;

import kr.ulsan.broadcast.voice.VoiceCastResult;
import kr.ulsan.broadcast.voice.VoiceService;
import kr.ulsan.broadcast.voice.VoiceSource;
import kr.ulsan.broadcast.voice.VoiceTarget;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 대시보드가 호출하는 자동음성 방송 API.
 *
 * <p>요청을 업체 형식으로 변환해 TCP 로 전송하고 업체 접수 결과를 돌려준다.
 * 필수값·길이 검사는 화면에서 한다. 이력·통신 로그는 이 모듈이 DB 에 저장한다({@link VoiceService}).
 */
@RestController
@RequestMapping("/api/broadcast/voice")
public class VoiceCastController {

    private final VoiceService voiceService;

    public VoiceCastController(VoiceService voiceService) {
        this.voiceService = voiceService;
    }

    /** 방송 실행. 업체 접수 결과를 SUCCESS / FAIL 로 돌려준다 (CAST ID 는 DB·로그에만). */
    @PostMapping
    public VoiceCastResponse cast(@RequestBody VoiceCastRequest request) {
        List<VoiceTarget> targets = request.targets() == null ? List.of() : request.targets().stream()
                .map(t -> new VoiceTarget(t.code(), t.name(), t.phone()))
                .toList();
        VoiceCastResult result = voiceService.cast(VoiceSource.SCREEN, request.title(), request.content(),
                request.alertSound(), targets);
        return VoiceCastResponse.from(result);
    }
}
