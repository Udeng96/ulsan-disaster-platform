package kr.ulsan.broadcast.signboard;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.ulsan.broadcast.BroadcastMode;
import kr.ulsan.broadcast.BroadcastProperties;
import kr.ulsan.broadcast.signboard.history.SignboardHistoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.ExpectedCount.times;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * 전광판 전송 검증: 전광판별로 새 알림 1건만 전송(빈 목록 먼저 안 보냄), 규격 필드명·헤더, 최대 4번 시도,
 * 전송 결과·표출 끝 시각 기록, 차단 모드, 전송 주소 설정, 테스트용 비우기(기록 안 함).
 * 전송은 동기 실행기 + 가짜 HTTP 서버로 검증.
 */
class SignboardPusherTest {

    private static final String SAMHO = "가상시설0208";
    private static final String YEOCHUN = "가상시설0210";
    private static final String SAMHO_URL = "http://가상시설0208:6892/PushEmergencyAlerts";
    private static final String OK = "{\"success\":true}";
    // 전송 시각(KST 14:00) + displayDuration 60초
    private static final LocalDateTime DISPLAY_UNTIL = LocalDateTime.of(2026, 7, 9, 14, 1);

    // KST 14:00
    private final Clock clock = Clock.fixed(Instant.parse("2026-07-09T05:00:00Z"), ZoneId.of("Asia/Seoul"));
    private final ObjectMapper objectMapper =
            new ObjectMapper().setSerializationInclusion(JsonInclude.Include.NON_NULL);
    private SignboardHistoryService history;
    private SignboardProperties props;
    private MockRestServiceServer server;

    @BeforeEach
    void setup() {
        history = mock(SignboardHistoryService.class);
        props = new SignboardProperties();
        props.setApiKey("test-key");
    }

    private SignboardPusher pusher(BroadcastMode mode) {
        BroadcastProperties broadcast = new BroadcastProperties();
        broadcast.setMode(mode);
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        return new SignboardPusher(props, broadcast, history, objectMapper, clock, builder.build(),
                host -> Runnable::run, Duration.ZERO);
    }

    private static EmergencyAlert alert(String id, List<String> targets) {
        return new EmergencyAlert(id, "가상시설0412 화재", 60, "화재", "urgent", null, null,
                "2026-07-09 14:00:00", "2026-07-09 14:20:00", targets);
    }

    @SuppressWarnings("unchecked")
    private List<PushAttempt> savedAttempts(String host, String status, LocalDateTime displayUntil) {
        ArgumentCaptor<List<PushAttempt>> captor = ArgumentCaptor.forClass(List.class);
        verify(history).savePush(eq(1L), eq(host), eq("A"), eq(displayUntil), eq(status), captor.capture(), any());
        return captor.getValue();
    }

    private List<PushAttempt> savedAttempts(String host, String status) {
        return savedAttempts(host, status, SignboardHistoryService.SUCCESS.equals(status) ? DISPLAY_UNTIL : null);
    }

    @Test
    void sendsOnlyNewAlertWithoutClearing() {
        SignboardPusher pusher = pusher(BroadcastMode.REAL);
        server.expect(times(1), requestTo(SAMHO_URL))   // 빈 목록 전송 없이 새 알림 1번만
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("key", "test-key"))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.list[0].identifier").value("A"))
                .andExpect(jsonPath("$.list[0].MSG_CN").value("가상시설0412 화재"))
                .andExpect(jsonPath("$.list[0].timestampKR").value("2026-07-09 14:00:00"))
                .andExpect(jsonPath("$.list[0].RCPTN_RGN_NM").doesNotExist())
                .andRespond(withSuccess(OK, MediaType.APPLICATION_JSON));

        pusher.push(1L, alert("A", List.of(SAMHO)), List.of(SAMHO));

        server.verify();
        verify(history).isShowing(SAMHO);
        List<PushAttempt> attempts = savedAttempts(SAMHO, SignboardHistoryService.SUCCESS, DISPLAY_UNTIL);
        assertThat(attempts).hasSize(1);
        assertThat(attempts.get(0).requestBody()).contains("\"count\":1");
        assertThat(attempts.get(0).responseBody()).isEqualTo(OK);
    }

    @Test
    void eachBoardIsSentSeparately() {
        SignboardPusher pusher = pusher(BroadcastMode.REAL);
        server.expect(requestTo(SAMHO_URL)).andRespond(withSuccess(OK, MediaType.APPLICATION_JSON));
        server.expect(requestTo("http://가상시설0210:6892/PushEmergencyAlerts"))
                .andRespond(withSuccess(OK, MediaType.APPLICATION_JSON));

        EmergencyAlert all = alert("A", null);
        pusher.push(1L, all, List.of(SAMHO, YEOCHUN));

        server.verify();
        savedAttempts(SAMHO, SignboardHistoryService.SUCCESS);
        savedAttempts(YEOCHUN, SignboardHistoryService.SUCCESS);
    }

    @Test
    void newAlertTriesFourTimesThenFails() {
        SignboardPusher pusher = pusher(BroadcastMode.REAL);
        server.expect(times(4), requestTo(SAMHO_URL)).andRespond(withServerError());

        pusher.push(1L, alert("A", List.of(SAMHO)), List.of(SAMHO));   // 처음 1번 + 3번 더

        server.verify();
        List<PushAttempt> attempts = savedAttempts(SAMHO, SignboardHistoryService.FAILED, null);   // 표출 끝 시각 없음
        assertThat(attempts).hasSize(4).noneMatch(PushAttempt::success);
        assertThat(attempts.get(3).error()).contains("500");
    }

    @Test
    void retriesOnInvalidApiKey() {
        SignboardPusher pusher = pusher(BroadcastMode.REAL);
        server.expect(requestTo(SAMHO_URL))
                .andRespond(withSuccess("{\"success\":false,\"message\":\"invalid api key\"}", MediaType.APPLICATION_JSON));
        server.expect(requestTo(SAMHO_URL)).andRespond(withSuccess(OK, MediaType.APPLICATION_JSON));

        pusher.push(1L, alert("A", List.of(SAMHO)), List.of(SAMHO));

        server.verify();
        List<PushAttempt> attempts = savedAttempts(SAMHO, SignboardHistoryService.SUCCESS);
        assertThat(attempts).hasSize(2);
        assertThat(attempts.get(0).error()).isEqualTo("전광판 거부: invalid api key");
    }

    @Test
    void octetStreamAndUnreadable200CountAsSuccess() {
        SignboardPusher pusher = pusher(BroadcastMode.REAL);
        // 실제 삼호교 응답: 본문은 JSON 인데 Content-Type 이 octet-stream → 1번으로 끝나야 함
        server.expect(times(1), requestTo(SAMHO_URL)).andRespond(withSuccess(OK, MediaType.APPLICATION_OCTET_STREAM));
        server.expect(times(1), requestTo(SAMHO_URL)).andRespond(withSuccess("OK", MediaType.TEXT_PLAIN));

        pusher.push(1L, alert("A", List.of(SAMHO)), List.of(SAMHO));
        pusher.push(1L, alert("A", List.of(SAMHO)), List.of(SAMHO));

        server.verify();   // 각각 1번씩만 보냄 = 둘 다 성공
    }

    @Test
    void pushUrlFromSettings() {
        props.setPushUrl("http://192.0.2.179/bcast-board/{host}/PushEmergencyAlerts");
        SignboardPusher pusher = pusher(BroadcastMode.REAL);
        server.expect(requestTo("http://192.0.2.179/bcast-board/가상시설0208/PushEmergencyAlerts"))
                .andRespond(withSuccess(OK, MediaType.APPLICATION_JSON));

        pusher.push(1L, alert("A", List.of(SAMHO)), List.of(SAMHO));

        server.verify();
    }

    @Test
    void blockedModeDoesNotSendButRecordsBlocked() {
        SignboardPusher pusher = pusher(BroadcastMode.BLOCKED);
        server.expect(org.springframework.test.web.client.ExpectedCount.never(), requestTo(SAMHO_URL));

        pusher.push(1L, alert("A", List.of(SAMHO)), List.of(SAMHO));

        server.verify();
        assertThat(savedAttempts(SAMHO, SignboardHistoryService.BLOCKED)).isEmpty();
    }

    @Test
    void clearSendsEmptyListOnlyAndRecordsNothing() {
        SignboardPusher pusher = pusher(BroadcastMode.TEST);
        server.expect(requestTo(SAMHO_URL))
                .andExpect(jsonPath("$.count").value(0))
                .andRespond(withSuccess(OK, MediaType.APPLICATION_JSON));

        pusher.clear(List.of(SAMHO));

        server.verify();
        verify(history, never()).savePush(any(), anyString(), anyString(), any(), anyString(), anyList(), any());
    }

    @Test
    void boardNameIsPartBeforeFirstDot() {
        assertThat(SignboardPusher.boardName("가상시설0208")).isEqualTo("samhogyo");
        assertThat(SignboardPusher.boardName("가상시설0207")).isEqualTo("가상시설0207");
    }

    @Test
    void showingStateIsCheckedPerBoard() {
        when(history.isShowing(SAMHO)).thenReturn(true);
        SignboardPusher pusher = pusher(BroadcastMode.BLOCKED);

        pusher.push(1L, alert("A", List.of(SAMHO, YEOCHUN)), List.of(SAMHO, YEOCHUN));

        verify(history).isShowing(SAMHO);
        verify(history).isShowing(YEOCHUN);
    }
}
