package kr.ulsan.broadcast;

import kr.ulsan.broadcast.voice.MockVoiceGateway;
import kr.ulsan.broadcast.voice.VoiceGateway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

/** 스프링 컨텍스트 배선 + 프로파일 기본값(dev=mock) 확인. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class ContextLoadsTest {

    @Autowired
    VoiceGateway voiceGateway;

    @Test
    void contextLoadsWithMockGatewayByDefault() {
        // 기본 프로파일 dev → mock 게이트웨이가 떠야 한다(실수로 업체 전송 방지).
        assertThat(voiceGateway).isInstanceOf(MockVoiceGateway.class);
    }
}
