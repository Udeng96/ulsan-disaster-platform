package kr.ulsan.broadcast.signboard.history;

import kr.ulsan.broadcast.commlog.CommLog;
import kr.ulsan.broadcast.commlog.CommLogService;
import kr.ulsan.broadcast.signboard.EmergencyAlert;
import kr.ulsan.broadcast.signboard.PushAttempt;
import kr.ulsan.broadcast.signboard.SignboardSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 전광판 이력({@code signboard_alert}·{@code signboard_push})과 통신 로그({@code comm_log}) 저장.
 * 빈 목록 전송(test 모드 비우기)은 저장하지 않는다.
 *
 * <p>전송은 저장과 상관없이 진행하므로 <b>저장 실패는 예외를 던지지 않고 error 로그만 남긴다.</b>
 */
@Service
public class SignboardHistoryService {

    private static final Logger log = LoggerFactory.getLogger(SignboardHistoryService.class);

    public static final String SUCCESS = "SUCCESS";
    public static final String FAILED = "FAILED";
    public static final String BLOCKED = "BLOCKED";

    private static final String REF_PUSH = "signboard_push";

    private final SignboardAlertRepository alerts;
    private final SignboardPushRepository pushes;
    private final CommLogService commLogs;
    private final TransactionTemplate tx;
    private final Clock clock;

    public SignboardHistoryService(SignboardAlertRepository alerts, SignboardPushRepository pushes,
                                   CommLogService commLogs, PlatformTransactionManager txManager, Clock clock) {
        this.alerts = alerts;
        this.pushes = pushes;
        this.commLogs = commLogs;
        this.tx = new TransactionTemplate(txManager);
        this.clock = clock;
    }

    /** 알림 저장 (화면 요청 + 모듈이 채운 값). 저장한 id, 실패하면 null. */
    public Long saveAlert(SignboardSource source, EmergencyAlert a, LocalDateTime expiresAt,
                          LocalDateTime requestedAt) {
        try {
            return tx.execute(status -> alerts.save(new SignboardAlertRecord(
                    source.name(), a.identifier(), a.msgCn(), a.displayDuration(), a.priority(),
                    cut(a.subType(), 100), cut(a.rcptnRgnNm(), 200), cut(a.agency(), 200),
                    a.timestampKr(), a.expires(), expiresAt, a.targetHosts(), requestedAt)).getId());
        } catch (Exception e) {
            log.error("전광판 알림 이력 저장 실패 (전송은 그대로 진행): {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * 전광판 1대 전송 결과 + 시도별 통신 로그. 알림 이력이 없으면(저장 실패) 남기지 않는다.
     * {@code displayUntil} 은 전송 성공 시각 + displayDuration (성공이 아니면 null).
     */
    public void savePush(Long alertId, String host, String identifier, LocalDateTime displayUntil,
                         String status, List<PushAttempt> attempts, String resultMessage) {
        if (alertId == null) {
            log.warn("전광판 전송 이력 생략 — 알림 이력 저장 실패 ({} {})", host, identifier);
            return;
        }
        try {
            tx.executeWithoutResult(s -> {
                LocalDateTime now = LocalDateTime.now(clock);
                Long pushId = pushes.save(new SignboardPushRecord(alertId, host, identifier, displayUntil, status,
                        attempts.size(), cut(resultMessage, 500), now)).getId();
                for (PushAttempt at : attempts) {
                    commLogs.save(new CommLog("SIGNBOARD", "OUT", "BOARD", cut(at.peer(), 200),
                            "PushEmergencyAlerts", at.requestBody(), at.responseBody(), at.success(),
                            cut(at.error(), 500), (int) at.elapsedMs(), REF_PUSH, pushId, now));
                }
            });
        } catch (Exception e) {
            log.error("전광판 전송 이력 저장 실패 ({} {}): {}", host, identifier, e.getMessage(), e);
        }
    }

    /**
     * 그 전광판에 마지막으로 전송 성공한 알림의 표출 끝 시각({@code display_until})이 아직 안 지났으면 표출중.
     * 그 뒤 전송이 실패했으면 전광판에는 성공한 알림이 그대로 떠 있으므로 실패 건은 보지 않는다.
     * 조회 실패는 표출 없음으로 본다.
     */
    public boolean isShowing(String host) {
        try {
            LocalDateTime now = LocalDateTime.now(clock);
            return pushes.findFirstByBoardHostAndStatusOrderByIdDesc(host, SUCCESS)
                    .map(p -> p.getDisplayUntil() != null && p.getDisplayUntil().isAfter(now))
                    .orElse(false);
        } catch (Exception e) {
            log.warn("전광판 표출 상태 조회 실패 ({}) — 표출 없음으로 처리: {}", host, e.getMessage());
            return false;
        }
    }

    private static String cut(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }
}
