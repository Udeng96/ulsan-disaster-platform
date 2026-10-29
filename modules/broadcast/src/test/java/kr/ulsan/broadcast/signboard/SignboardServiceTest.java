package kr.ulsan.broadcast.signboard;

import kr.ulsan.broadcast.FacilityFixture;
import kr.ulsan.broadcast.commlog.CommLogRepository;
import kr.ulsan.broadcast.signboard.history.SignboardAlertRecord;
import kr.ulsan.broadcast.signboard.history.SignboardAlertRepository;
import kr.ulsan.broadcast.signboard.history.SignboardHistoryService;
import kr.ulsan.broadcast.signboard.history.SignboardPushRecord;
import kr.ulsan.broadcast.signboard.history.SignboardPushRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 전광판 API → 모듈이 채운 값·이력 저장(blocked 모드), 전체 전광판 = DB 목록, 검증 실패, "현재 표출중" 판단. */
@SpringBootTest
@AutoConfigureMockMvc
class SignboardServiceTest {

    private static final String SAMHO = "가상시설0208";
    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Autowired
    MockMvc mvc;
    @Autowired
    SignboardAlertRepository alerts;
    @Autowired
    SignboardPushRepository pushes;
    @Autowired
    CommLogRepository commLogs;
    @Autowired
    SignboardHistoryService history;
    @Autowired
    Clock clock;
    @Autowired
    JdbcTemplate jdbc;
    @Value("${spring.jpa.properties.hibernate.default_schema}")
    String schema;

    @BeforeEach
    void clean() {
        commLogs.deleteAll();
        pushes.deleteAll();
        alerts.deleteAll();
    }

    private static String body(String targets) {
        return """
                {"msgCn":"가상시설0412 화재"%s}
                """.formatted(targets == null ? "" : ",\"targetHosts\":" + targets);
    }

    private List<SignboardPushRecord> awaitPushes(int count) throws InterruptedException {
        for (int i = 0; i < 100 && pushes.count() < count; i++) {
            Thread.sleep(30);   // 전송은 응답 뒤 비동기
        }
        return pushes.findAll();
    }

    @Test
    void moduleFillsAlertValuesAndSavesBlockedPush() throws Exception {
        mvc.perform(post("/internal/signboard/alerts").contentType(MediaType.APPLICATION_JSON)
                        .content(body("[\"" + SAMHO + "\"]")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.message[0]").value(org.hamcrest.Matchers.startsWith(SAMHO + " : KR-ULSAN-NAMGU-")));

        SignboardAlertRecord alert = alerts.findAll().get(0);
        assertThat(alert.getSource()).isEqualTo("SCREEN");
        assertThat(alert.getIdentifier()).matches("KR-ULSAN-NAMGU-\\d{17}");
        assertThat(alert.getMsgCn()).isEqualTo("가상시설0412 화재");
        assertThat(alert.getDisplayDuration()).isEqualTo(1200);
        assertThat(alert.getPriority()).isEqualTo("urgent");
        assertThat(alert.getSubType()).isEqualTo("긴급");
        assertThat(alert.getRcptnRgnNm()).isEqualTo("가상시설0565");
        assertThat(alert.getAgency()).isEqualTo("울산남구청");
        LocalDateTime requested = LocalDateTime.parse(alert.getTimestampKr(), TS);
        assertThat(alert.getIdentifier()).contains(requested.format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")));
        assertThat(alert.getExpiresAt()).isEqualTo(requested.plusMinutes(20));
        assertThat(alert.getExpires()).isEqualTo(requested.plusMinutes(20).format(TS));
        assertThat(alert.getTargetHosts()).containsExactly(SAMHO);

        SignboardPushRecord push = awaitPushes(1).get(0);
        assertThat(push.getSignboardAlertId()).isEqualTo(alert.getId());
        assertThat(push.getIdentifier()).isEqualTo(alert.getIdentifier());
        assertThat(push.getBoardHost()).isEqualTo(SAMHO);
        assertThat(push.getStatus()).isEqualTo("BLOCKED");
        assertThat(push.getDisplayUntil()).isNull();   // 실제로 안 보냈으니 표출 없음
        assertThat(push.getAttempts()).isZero();
        assertThat(commLogs.count()).isZero();   // 실제 전송이 없으니 통신 로그 없음
    }

    @Test
    void everyRequestGetsNewIdentifier() throws Exception {
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/internal/signboard/alerts").contentType(MediaType.APPLICATION_JSON)
                    .content(body("[\"" + SAMHO + "\"]"))).andExpect(status().isOk());
            Thread.sleep(2);
        }
        assertThat(alerts.findAll()).extracting(SignboardAlertRecord::getIdentifier).doesNotHaveDuplicates();
        awaitPushes(2);   // 비동기 전송 기록이 다음 테스트로 넘어가지 않게 기다림
    }

    @Test
    void noTargetsMeansAllBoardsWithHost() throws Exception {
        FacilityFixture.reset(jdbc, schema);   // 전광판 4대 중 host 있는 3대
        mvc.perform(post("/internal/signboard/alerts").contentType(MediaType.APPLICATION_JSON)
                        .content(body(null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message.length()").value(3));

        assertThat(alerts.findAll().get(0).getTargetHosts()).isNull();
        assertThat(awaitPushes(3)).extracting(SignboardPushRecord::getBoardHost)
                .containsExactlyInAnyOrder("가상시설0210", SAMHO, "가상시설0207");
    }

    @Test
    void missingOrBlankMsgCnIsRejected() throws Exception {
        for (String json : List.of("{\"targetHosts\":[\"" + SAMHO + "\"]}", "{\"msgCn\":\"  \"}")) {
            mvc.perform(post("/internal/signboard/alerts").contentType(MediaType.APPLICATION_JSON).content(json))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value("VALIDATION_ERROR"))
                    .andExpect(jsonPath("$.message[0]").value(org.hamcrest.Matchers.startsWith("msgCn: ")));
        }
        assertThat(alerts.count()).isZero();
    }

    @Test
    void showingMeansLastSuccessIsBeforeDisplayUntil() {
        LocalDateTime now = LocalDateTime.now(clock);
        Long id = alerts.save(new SignboardAlertRecord("SCREEN", "A", "m", 60, "urgent", null, null, null,
                "2026-10-13 10:00:00", "2026-10-13 11:00:00", now.plusHours(1), null, now)).getId();
        assertThat(history.isShowing(SAMHO)).isFalse();   // 보낸 적 없음

        history.savePush(id, SAMHO, "A", now.plusMinutes(1), SignboardHistoryService.SUCCESS, List.of(), "ok");
        assertThat(history.isShowing(SAMHO)).isTrue();
        assertThat(history.isShowing("가상시설0210")).isFalse();   // 전광판별

        history.savePush(id, SAMHO, "B", null, SignboardHistoryService.FAILED, List.of(), "err");
        assertThat(history.isShowing(SAMHO)).isTrue();   // 새 알림 실패 → 앞서 성공한 A 가 그대로 떠 있음

        history.savePush(id, SAMHO, "C", now.minusSeconds(1), SignboardHistoryService.SUCCESS, List.of(), "ok");
        assertThat(history.isShowing(SAMHO)).isFalse();   // 마지막 성공 건의 표출 시간이 지남
    }

    @Test
    void pushAttemptsAreSavedAsCommLogs() {
        LocalDateTime now = LocalDateTime.now(clock).truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
        Long id = alerts.save(new SignboardAlertRecord("SCREEN", "A", "m", 60, "urgent", null, null, null,
                "2026-10-13 10:00:00", "2026-10-13 11:00:00", now.plusHours(1), List.of(SAMHO), now)).getId();
        history.savePush(id, SAMHO, "A", now.plusMinutes(1), SignboardHistoryService.SUCCESS, List.of(
                new PushAttempt("http://x/PushEmergencyAlerts", "{\"count\":1}", null, false, "timeout", 5000),
                new PushAttempt("http://x/PushEmergencyAlerts", "{\"count\":1}", "{\"success\":true}", true, null, 30)),
                "{\"success\":true}");

        SignboardPushRecord push = pushes.findAll().get(0);
        assertThat(push.getAttempts()).isEqualTo(2);
        assertThat(push.getDisplayUntil()).isEqualTo(now.plusMinutes(1));
        assertThat(commLogs.findAll()).hasSize(2).allSatisfy(c -> {
            assertThat(c.getChannel()).isEqualTo("SIGNBOARD");
            assertThat(c.getPeerType()).isEqualTo("BOARD");
            assertThat(c.getRefTable()).isEqualTo("signboard_push");
            assertThat(c.getRefId()).isEqualTo(push.getId());
        });
    }
}
