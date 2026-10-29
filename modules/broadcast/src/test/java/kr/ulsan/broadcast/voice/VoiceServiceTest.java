package kr.ulsan.broadcast.voice;

import kr.ulsan.broadcast.commlog.CommLog;
import kr.ulsan.broadcast.commlog.CommLogRepository;
import kr.ulsan.broadcast.voice.history.VoiceCastRecord;
import kr.ulsan.broadcast.voice.history.VoiceCastRepository;
import kr.ulsan.broadcast.voice.history.VoiceCastTargetRecord;
import kr.ulsan.broadcast.voice.history.VoiceCastTargetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/** VoiceService: 업체 결과(OK/NOK/통신 실패/blocked)별 로그·이력·통신 로그 저장 확인. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ExtendWith(OutputCaptureExtension.class)
class VoiceServiceTest {

    private static final List<VoiceTarget> TARGETS = List.of(
            new VoiceTarget("SGB001", "구복", "012-2179-4112"),
            new VoiceTarget("SGB002", "신화", "012-2179-4113"));

    @MockBean
    VoiceGateway gateway;

    @Autowired
    VoiceService service;
    @Autowired
    VoiceCastRepository casts;
    @Autowired
    VoiceCastTargetRepository castTargets;
    @Autowired
    CommLogRepository commLogs;

    @BeforeEach
    void clean() {
        commLogs.deleteAll();
        castTargets.deleteAll();
        casts.deleteAll();
    }

    private static VoiceExchange exchange(String response, String error) {
        return new VoiceExchange("192.0.2.125:36302", "EXP REQST TERM TTS CAST", "{\"REQUEST WORD\":\"...\"}",
                response, 12, error);
    }

    @Test
    void okIsSavedAsAccepted(CapturedOutput output) {
        when(gateway.cast(anyString(), anyString(), any(), anyList())).thenReturn(new VoiceCastResult(
                true, "C-1", "OK", exchange("{\"RESULT MESSG\":\"OK\",\"CAST ID\":\"C-1\"}", null)));

        VoiceCastResult result = service.cast(VoiceSource.SCREEN, "호우경보", "내용", "재난", TARGETS);

        assertThat(result.castId()).isEqualTo("C-1");
        VoiceCastRecord cast = casts.findAll().get(0);
        assertThat(cast.getSource()).isEqualTo("SCREEN");
        assertThat(cast.getStatus()).isEqualTo("ACCEPTED");
        assertThat(cast.getAlertSound()).isEqualTo("DISASTER");
        assertThat(cast.getCastId()).isEqualTo("C-1");
        assertThat(castTargets.findByVoiceCastId(cast.getId()))
                .extracting(VoiceCastTargetRecord::getTermCode).containsExactly("SGB001", "SGB002");

        CommLog commLog = commLogs.findAll().get(0);
        assertThat(commLog.getChannel()).isEqualTo("VOICE");
        assertThat(commLog.getPeerType()).isEqualTo("VENDOR");
        assertThat(commLog.isSuccess()).isTrue();
        assertThat(commLog.getResponseBody()).contains("C-1");
        assertThat(commLog.getRefTable()).isEqualTo("voice_cast");
        assertThat(commLog.getRefId()).isEqualTo(cast.getId());

        assertThat(output).contains("[VOICE RECEIVE] 음성통보 요청이 들어왔습니다.")
                .contains("[VOICE CONTENT] {\"title\":\"호우경보\"")
                .contains("[VOICE RESPONSE] SUCCESS (CAST ID: C-1)")
                .doesNotContain("입구");
    }

    @Test
    void nokIsSavedAsRejected(CapturedOutput output) {
        when(gateway.cast(anyString(), anyString(), any(), anyList())).thenReturn(new VoiceCastResult(
                false, null, "NOK (권한없음)", exchange("{\"RESULT MESSG\":\"NOK (권한없음)\"}", null)));

        service.cast(VoiceSource.SCREEN, "t", "c", null, TARGETS);

        VoiceCastRecord cast = casts.findAll().get(0);
        assertThat(cast.getStatus()).isEqualTo("REJECTED");
        assertThat(cast.getAlertSound()).isEqualTo("DEFAULT");   // 미지정 → 설정 기본값(0)
        assertThat(cast.getResultMessage()).startsWith("NOK");
        assertThat(output).contains("[VOICE RESPONSE] FAIL 업체 거부: NOK (권한없음)");
    }

    @Test
    void vendorFailureIsSavedAsFailedAndRethrown(CapturedOutput output) {
        String error = "업체 통신 실패: Connection refused";
        when(gateway.cast(anyString(), anyString(), any(), anyList()))
                .thenThrow(new VoiceException(error, null, exchange(null, error)));

        assertThatThrownBy(() -> service.cast(VoiceSource.CAP, "t", "c", "없음", TARGETS))
                .isInstanceOf(VoiceException.class);

        VoiceCastRecord cast = casts.findAll().get(0);
        assertThat(cast.getSource()).isEqualTo("CAP");
        assertThat(cast.getStatus()).isEqualTo("FAILED");
        assertThat(cast.getAlertSound()).isEqualTo("NONE");
        CommLog commLog = commLogs.findAll().get(0);
        assertThat(commLog.isSuccess()).isFalse();
        assertThat(commLog.getErrorMessage()).isEqualTo(error);
        assertThat(commLog.getResponseBody()).isNull();
        assertThat(output).contains("[VOICE RESPONSE] FAIL 업체 통신 실패: Connection refused");
    }

    @Test
    void blockedIsSavedAsBlocked(CapturedOutput output) {
        when(gateway.cast(anyString(), anyString(), any(), anyList())).thenReturn(new VoiceCastResult(
                true, null, "(blocked, 전송 생략)", exchange(null, null), true));

        VoiceCastResult result = service.cast(VoiceSource.SCREEN, "t", "c", "기본", TARGETS);

        assertThat(result.accepted()).isTrue();
        assertThat(result.castId()).isNull();
        VoiceCastRecord cast = casts.findAll().get(0);
        assertThat(cast.getStatus()).isEqualTo("BLOCKED");
        assertThat(cast.getCastId()).isNull();
        assertThat(output).contains("[VOICE RESPONSE] SUCCESS (blocked, 전송 생략)");
    }

    @Test
    void emptyValuesAreStillSentAndSaved() {
        when(gateway.cast(any(), any(), any(), anyList())).thenReturn(new VoiceCastResult(
                false, null, "NOK (값 없음)", exchange("{\"RESULT MESSG\":\"NOK (값 없음)\"}", null)));

        service.cast(VoiceSource.SCREEN, null, null, null, null);   // 화면이 검사하므로 모듈은 막지 않음

        VoiceCastRecord cast = casts.findAll().get(0);
        assertThat(cast.getStatus()).isEqualTo("REJECTED");
        assertThat(cast.getTitle()).isEmpty();
        assertThat(castTargets.findByVoiceCastId(cast.getId())).isEmpty();
    }

    @Test
    void saveFailureDoesNotBlockResponse() {
        when(gateway.cast(anyString(), anyString(), any(), anyList()))
                .thenReturn(new VoiceCastResult(true, "C-2", "OK", exchange("{}", null)));
        // term_code NOT NULL 위반 → 저장 실패(롤백)
        List<VoiceTarget> bad = List.of(new VoiceTarget(null, "이름", "012-0000-0000"));

        VoiceCastResult result = service.cast(VoiceSource.SCREEN, "t", "c", null, bad);

        assertThat(result.castId()).isEqualTo("C-2");
        assertThat(casts.count()).isZero();
        assertThat(commLogs.count()).isZero();
    }
}
