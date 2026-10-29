package kr.ulsan.broadcast.voice;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 자동음성 업체 TCP 클라이언트.
 *
 * <p>규격: JSON(UTF-8)을 TCP 로 주고받으며, 각 전문 끝을 <b>CR+LF(0x0D 0x0A)</b> 로 구분한다.
 * 본문에는 raw CR+LF 를 넣지 않고(개행은 JSON 이스케이프 {@code \r\n}로 담김), 전송 시 마지막에만 붙인다.
 * 필드명은 규격 그대로 공백을 포함하며(예: "REQUEST WORD"), 값은 모두 문자열이다.
 *
 * <p>실제 송신 빈이다. {@code broadcast.mode} 가 REAL/TEST 일 때 뜨고, BLOCKED(기본)면
 * {@link MockVoiceGateway}가 대신 뜬다.
 */
@Component
@ConditionalOnExpression("!'${broadcast.mode:blocked}'.equalsIgnoreCase('blocked')")
public class VoiceClient implements VoiceGateway {

    private static final Logger log = LoggerFactory.getLogger(VoiceClient.class);
    private static final byte[] CRLF = {0x0D, 0x0A};

    private final VoiceProperties props;
    private final ObjectMapper objectMapper;

    public VoiceClient(VoiceProperties props, ObjectMapper objectMapper) {
        this.props = props;
        this.objectMapper = objectMapper;
    }

    /**
     * TTS 방송 실행 요청(EXP REQST TERM TTS CAST).
     *
     * @param title      방송 제목 → CAST TITLE
     * @param content    방송 내용 → CAST BODY
     * @param alertSound 알림벨 "재난"/"기본"/"없음"(또는 코드). null/공백이면 설정 기본값.
     * @param targets    방송 대상 단말 → DEST LIST
     *
     * <p>제목·내용 길이(64/2000)와 필수값은 화면에서 제한하므로 여기서는 받은 그대로 보낸다.
     */
    @Override
    public VoiceCastResult cast(String title, String content, String alertSound, List<VoiceTarget> targets) {
        String chimeYn = resolveChimeYn(alertSound);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("REQUEST WORD", "EXP REQST TERM TTS CAST");
        body.put("ORGAN CODE", props.getOrganCode());
        body.put("USER ID", props.getUserId());
        body.put("CAST TITLE", title);
        body.put("CAST BODY", normalizeNewlines(content));
        body.put("PRE SILENCE", props.getPreSilence());
        body.put("PST SILENCE", props.getPstSilence());
        body.put("READ SPEED", props.getReadSpeed());
        body.put("REPETITIONS", props.getRepetitions());
        body.put("CAST VOLUME", props.getCastVolume());
        body.put("CHIME YN", chimeYn);
        body.put("DEST LIST", destList(targets));

        Sent sent = send(body);
        String resultMessage = text(sent.json(), "RESULT MESSG");
        return new VoiceCastResult(isOk(resultMessage), text(sent.json(), "CAST ID"), resultMessage,
                sent.exchange());
    }

    /**
     * 대시보드 알림벨 값 → 업체 CHIME YN 코드.
     * "기본"→"0", "재난"→"1", "없음"→"9". 이미 코드("0"/"1"/"9")면 그대로.
     * null/공백/미지의 값은 설정 기본값.
     */
    private String resolveChimeYn(String alertSound) {
        if (alertSound != null && !alertSound.isBlank() && AlertSound.from(alertSound) == null) {
            log.warn("알 수 없는 alertSound='{}' → 기본값 '{}' 사용", alertSound, props.getChimeYn());
        }
        return AlertSound.resolve(alertSound, props.getChimeYn()).chimeYn();
    }

    private List<Map<String, String>> destList(List<VoiceTarget> targets) {
        if (targets == null) {
            return List.of();
        }
        return targets.stream().map(t -> {
            Map<String, String> m = new LinkedHashMap<>();
            m.put("TERM CODE", t.code());
            m.put("TERM NAME", t.name());
            m.put("TERM CDMA", t.phone());
            return m;
        }).toList();
    }

    /** 보낸 전문의 응답(파싱 결과)과 주고받은 원문. */
    private record Sent(JsonNode json, VoiceExchange exchange) {
    }

    /**
     * 전문 1건을 보내고 응답 1건을 받아 파싱한다. 받은 원문은 {@code [VOICE RESULT]}로 남긴다.
     * 실패하면 보낸 원문·오류를 담은 {@link VoiceException}을 던진다.
     */
    private Sent send(Map<String, Object> body) {
        String requestWord = String.valueOf(body.get("REQUEST WORD"));
        String json;
        try {
            json = objectMapper.writeValueAsString(body);
        } catch (Exception e) {
            throw new VoiceException("요청 직렬화 실패", e);
        }

        String peer = props.getHost() + ":" + props.getPort();
        long start = System.currentTimeMillis();
        String response = null;
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(props.getHost(), props.getPort()), props.getTimeoutMs());
            socket.setSoTimeout(props.getTimeoutMs());

            OutputStream out = socket.getOutputStream();
            out.write(json.getBytes(StandardCharsets.UTF_8));
            out.write(CRLF);
            out.flush();

            response = readUntilCrlf(socket.getInputStream());
            log.info("[VOICE RESULT] {}", response);
            JsonNode parsed = objectMapper.readTree(response);
            return new Sent(parsed, new VoiceExchange(peer, requestWord, json, response,
                    System.currentTimeMillis() - start, null));
        } catch (Exception e) {
            String reason = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            String message = "업체 통신 실패: " + reason;
            if (response == null) {
                log.error("[VOICE RESULT] 응답 없음: {} ({})", reason, peer);
            } else {
                log.error("[VOICE RESULT] 응답 해석 실패: {} ({})", reason, peer);   // 원문은 바로 위 RESULT 줄
            }
            throw new VoiceException(message, e, new VoiceExchange(peer, requestWord, json, response,
                    System.currentTimeMillis() - start, message));
        }
    }

    /** CR+LF 를 만날 때까지(또는 연결 종료까지) 읽어 UTF-8 문자열로 반환. */
    private String readUntilCrlf(InputStream in) throws Exception {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        int prev = -1;
        int b;
        while ((b = in.read()) != -1) {
            if (prev == 0x0D && b == 0x0A) {
                byte[] bytes = buf.toByteArray();
                int len = bytes.length > 0 && bytes[bytes.length - 1] == 0x0D ? bytes.length - 1 : bytes.length;
                return new String(bytes, 0, len, StandardCharsets.UTF_8);
            }
            buf.write(b);
            prev = b;
        }
        if (buf.size() == 0) {
            throw new VoiceException("업체 응답 없음(빈 응답)");
        }
        return buf.toString(StandardCharsets.UTF_8);
    }

    private boolean isOk(String resultMessage) {
        return resultMessage != null && resultMessage.trim().toUpperCase().startsWith("OK");
    }

    /** 본문 개행을 CR+LF 로 정규화(JSON 직렬화 시 \r\n 이스케이프됨). */
    private String normalizeNewlines(String s) {
        return s == null ? null : s.replaceAll("\\r\\n|\\r|\\n", "\r\n");
    }

    private String text(JsonNode node, String field) {
        JsonNode v = node.get(field);
        return v == null || v.isNull() ? null : v.asText();
    }
}
