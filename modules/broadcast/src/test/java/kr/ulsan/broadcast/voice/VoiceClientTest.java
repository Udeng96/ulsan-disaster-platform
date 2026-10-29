package kr.ulsan.broadcast.voice;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 업체 TCP 프로토콜(전송 전문 구성 + CRLF 프레이밍 + 응답 파싱) 검증. */
class VoiceClientTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    private VoiceProperties props(int port) {
        VoiceProperties p = new VoiceProperties();
        p.setHost("127.0.0.1");
        p.setPort(port);
        p.setOrganCode("UCS025");
        p.setUserId("ahnjogi");
        return p;
    }

    @Test
    void castBuildsSpecRequestAndParsesCastId() throws Exception {
        try (FakeServer server = new FakeServer("{\"RESULT MESSG\":\"OK\",\"CAST ID\":\"20260721_0001\"}")) {
            VoiceClient client = new VoiceClient(props(server.port()), objectMapper);

            VoiceCastResult result = client.cast(
                    "호우경보 발령",
                    "울산 중구 호우경보\n하천 접근 자제",   // 개행 포함
                    null,                                     // chime 미지정 → 기본 "0"
                    List.of(new VoiceTarget("SGB001", "구복", "012-2179-4112")));

            assertThat(result.accepted()).isTrue();
            assertThat(result.castId()).isEqualTo("20260721_0001");

            String sent = server.received();
            assertThat(sent).contains("\"REQUEST WORD\":\"EXP REQST TERM TTS CAST\"");
            assertThat(sent).contains("\"ORGAN CODE\":\"UCS025\"");
            assertThat(sent).contains("\"USER ID\":\"ahnjogi\"");
            assertThat(sent).contains("\"CAST TITLE\":\"호우경보 발령\"");
            assertThat(sent).contains("\"CHIME YN\":\"0\"");            // 설정 기본값
            assertThat(sent).contains("\"TERM CODE\":\"SGB001\"");
            assertThat(sent).contains("\"TERM CDMA\":\"012-2179-4112\"");
            // 본문 개행은 JSON 이스케이프(\r\n)로 담겨 raw CR/LF 없음 (프레이밍과 충돌 방지)
            assertThat(sent).contains("\\r\\n");
            assertThat(sent).doesNotContain("\n").doesNotContain("\r");

            // 통신 로그용 전문: 보낸 원문·받은 원문 그대로
            VoiceExchange ex = result.exchange();
            assertThat(ex.success()).isTrue();
            assertThat(ex.peer()).isEqualTo("127.0.0.1:" + server.port());
            assertThat(ex.requestWord()).isEqualTo("EXP REQST TERM TTS CAST");
            assertThat(ex.requestBody()).isEqualTo(sent);
            assertThat(ex.responseBody()).isEqualTo("{\"RESULT MESSG\":\"OK\",\"CAST ID\":\"20260721_0001\"}");
        }
    }

    @Test
    void connectionFailureCarriesExchange() throws Exception {
        int closedPort;
        try (ServerSocket s = new ServerSocket(0)) {
            closedPort = s.getLocalPort();
        }
        VoiceClient client = new VoiceClient(props(closedPort), objectMapper);

        assertThatThrownBy(() -> client.cast("t", "c", null, List.of(new VoiceTarget("A", "가", "012-0000-0000"))))
                .isInstanceOfSatisfying(VoiceException.class, e -> {
                    assertThat(e.getMessage()).startsWith("업체 통신 실패");
                    assertThat(e.exchange().success()).isFalse();
                    assertThat(e.exchange().requestBody()).contains("EXP REQST TERM TTS CAST");
                    assertThat(e.exchange().responseBody()).isNull();
                });
    }

    @Test
    void mapsAlertSoundTextToChimeCode() throws Exception {
        try (FakeServer server = new FakeServer("{\"RESULT MESSG\":\"OK\",\"CAST ID\":\"C1\"}")) {
            VoiceClient client = new VoiceClient(props(server.port()), objectMapper);
            client.cast("t", "c", "없음", List.of(new VoiceTarget("A", "가", "012-0000-0000")));
            assertThat(server.received()).contains("\"CHIME YN\":\"9\"");   // 없음 → 9
        }
        try (FakeServer server = new FakeServer("{\"RESULT MESSG\":\"OK\",\"CAST ID\":\"C2\"}")) {
            VoiceClient client = new VoiceClient(props(server.port()), objectMapper);
            client.cast("t", "c", "재난", List.of(new VoiceTarget("A", "가", "012-0000-0000")));
            assertThat(server.received()).contains("\"CHIME YN\":\"1\"");   // 재난 → 1
        }
    }

    @Test
    void longTitleAndBodyAreSentAsIs() throws Exception {
        String title = "제".repeat(70);      // 업체 한도 64 초과 — 화면이 막으므로 모듈은 자르지 않음
        String body = "내".repeat(2100);     // 업체 한도 2000 초과
        try (FakeServer server = new FakeServer("{\"RESULT MESSG\":\"OK\",\"CAST ID\":\"C3\"}")) {
            VoiceClient client = new VoiceClient(props(server.port()), objectMapper);
            client.cast(title, body, null, List.of(new VoiceTarget("A", "가", "012-0000-0000")));
            assertThat(server.received()).contains("\"CAST TITLE\":\"" + title + "\"")
                    .contains("\"CAST BODY\":\"" + body + "\"");
        }
    }

    @Test
    void nullTargetsAreSentAsEmptyList() throws Exception {
        try (FakeServer server = new FakeServer("{\"RESULT MESSG\":\"NOK (대상 없음)\"}")) {
            VoiceClient client = new VoiceClient(props(server.port()), objectMapper);
            VoiceCastResult r = client.cast("t", "c", null, null);
            assertThat(server.received()).contains("\"DEST LIST\":[]");
            assertThat(r.accepted()).isFalse();
        }
    }

    @Test
    void nokResponseIsNotAccepted() throws Exception {
        try (FakeServer server = new FakeServer("{\"RESULT MESSG\":\"NOK (권한없음)\"}")) {
            VoiceClient client = new VoiceClient(props(server.port()), objectMapper);
            VoiceCastResult r = client.cast("t", "c", "1", List.of(new VoiceTarget("A", "가", "012-0000-0000")));
            assertThat(r.accepted()).isFalse();
            assertThat(r.resultMessage()).startsWith("NOK");
        }
    }

    /** 한 연결을 받아 CR+LF 까지 읽어 저장하고, 지정 응답 + CR+LF 를 돌려주는 테스트용 서버. */
    static class FakeServer implements AutoCloseable {
        private final ServerSocket server;
        private final String response;
        private volatile String received;

        FakeServer(String response) throws IOException {
            this.response = response;
            this.server = new ServerSocket(0);
            Thread t = new Thread(this::run);
            t.setDaemon(true);
            t.start();
        }

        int port() {
            return server.getLocalPort();
        }

        String received() throws InterruptedException {
            for (int i = 0; i < 100 && received == null; i++) {
                Thread.sleep(20);
            }
            return received;
        }

        private void run() {
            try (Socket s = server.accept()) {
                InputStream in = s.getInputStream();
                ByteArrayOutputStream buf = new ByteArrayOutputStream();
                int prev = -1;
                int b;
                while ((b = in.read()) != -1) {
                    if (prev == 0x0D && b == 0x0A) {
                        break;
                    }
                    buf.write(b);
                    prev = b;
                }
                byte[] bytes = buf.toByteArray();
                int len = bytes.length > 0 && bytes[bytes.length - 1] == 0x0D ? bytes.length - 1 : bytes.length;
                received = new String(bytes, 0, len, StandardCharsets.UTF_8);

                OutputStream out = s.getOutputStream();
                out.write(response.getBytes(StandardCharsets.UTF_8));
                out.write(new byte[]{0x0D, 0x0A});
                out.flush();
            } catch (IOException ignored) {
                // 테스트 종료 시 소켓 close 로 인한 예외 무시
            }
        }

        @Override
        public void close() throws IOException {
            server.close();
        }
    }
}
