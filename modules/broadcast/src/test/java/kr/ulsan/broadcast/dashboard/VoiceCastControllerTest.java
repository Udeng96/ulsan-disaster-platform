package kr.ulsan.broadcast.dashboard;

import kr.ulsan.broadcast.voice.VoiceCastResult;
import kr.ulsan.broadcast.voice.VoiceException;
import kr.ulsan.broadcast.voice.VoiceGateway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 화면 응답 모양: SUCCESS / FAIL + message, 통신 실패는 502. */
@SpringBootTest
@AutoConfigureMockMvc
class VoiceCastControllerTest {

    private static final String BODY = """
            {"title":"t","content":"c","targets":[{"code":"A","name":"가","phone":"012"}]}""";

    @Autowired
    MockMvc mvc;

    @MockBean
    VoiceGateway gateway;

    private ResultActions send() throws Exception {
        return mvc.perform(post("/api/broadcast/voice").contentType(MediaType.APPLICATION_JSON).content(BODY));
    }

    @Test
    void okIsSuccessWithoutMessage() throws Exception {
        when(gateway.cast(any(), any(), any(), anyList())).thenReturn(new VoiceCastResult(true, "C-1", "OK"));
        send().andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.message").doesNotExist())
                .andExpect(jsonPath("$.castId").doesNotExist());
    }

    @Test
    void nokIsFailWithReason() throws Exception {
        when(gateway.cast(any(), any(), any(), anyList())).thenReturn(new VoiceCastResult(false, null, "NOK(권한없음)"));
        send().andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FAIL"))
                .andExpect(jsonPath("$.message").value("업체 거부: NOK(권한없음)"));
    }

    @Test
    void vendorFailureIs502() throws Exception {
        when(gateway.cast(any(), any(), any(), anyList())).thenThrow(new VoiceException("업체 통신 실패: Connection refused"));
        send().andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.status").value("FAIL"))
                .andExpect(jsonPath("$.message").value("업체 통신 실패: Connection refused"));
    }

    @Test
    void blockedIsSuccessWithNote() throws Exception {
        when(gateway.cast(any(), any(), any(), anyList()))
                .thenReturn(new VoiceCastResult(true, null, "(blocked, 전송 생략)", null, true));
        send().andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.message").value("(blocked, 전송 생략)"));
    }
}
