package kr.ulsan.broadcast.signboard.history;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * 전광판 1대에 새 알림을 보낸 최종 결과 ({@code signboard_push}). 빈 목록 전송(test 모드 비우기)은 남기지 않는다.
 *
 * <p>"현재 표출중" 판단: 그 전광판에 마지막으로 성공한 건의 {@code display_until} 이 아직 안 지났으면 표출중.
 */
@Entity
@Table(name = "signboard_push")
public class SignboardPushRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "signboard_alert_id", nullable = false)
    private Long signboardAlertId;

    @Column(name = "board_host", nullable = false, length = 100)
    private String boardHost;

    @Column(nullable = false, length = 100)
    private String identifier;

    /** 전송 성공 시각 + displayDuration (전광판이 내리는 시각). 성공이 아니면 null */
    @Column(name = "display_until")
    private LocalDateTime displayUntil;

    /** SUCCESS / FAILED / BLOCKED */
    @Column(nullable = false, length = 10)
    private String status;

    /** 시도 횟수 (blocked 는 0) */
    @Column(nullable = false)
    private int attempts;

    /** 마지막 응답 원문 또는 실패 사유 */
    @Column(name = "result_message", length = 500)
    private String resultMessage;

    @Column(name = "pushed_at", nullable = false)
    private LocalDateTime pushedAt;

    protected SignboardPushRecord() {
    }

    public SignboardPushRecord(Long signboardAlertId, String boardHost, String identifier,
                               LocalDateTime displayUntil, String status, int attempts, String resultMessage,
                               LocalDateTime pushedAt) {
        this.signboardAlertId = signboardAlertId;
        this.boardHost = boardHost;
        this.identifier = identifier;
        this.displayUntil = displayUntil;
        this.status = status;
        this.attempts = attempts;
        this.resultMessage = resultMessage;
        this.pushedAt = pushedAt;
    }

    public Long getId() {
        return id;
    }

    public Long getSignboardAlertId() {
        return signboardAlertId;
    }

    public String getBoardHost() {
        return boardHost;
    }

    public String getIdentifier() {
        return identifier;
    }

    public LocalDateTime getDisplayUntil() {
        return displayUntil;
    }

    public String getStatus() {
        return status;
    }

    public int getAttempts() {
        return attempts;
    }

    public String getResultMessage() {
        return resultMessage;
    }

    public LocalDateTime getPushedAt() {
        return pushedAt;
    }
}
