package kr.ulsan.broadcast.voice.history;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/** 자동음성 방송 1건 ({@code voice_cast}). 스키마는 {@code hibernate.default_schema}로 정한다. */
@Entity
@Table(name = "voice_cast")
public class VoiceCastRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** SCREEN / CAP */
    @Column(nullable = false, length = 10)
    private String source;

    @Column(name = "cap_message_id")
    private Long capMessageId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    /** DISASTER / DEFAULT / NONE */
    @Column(name = "alert_sound", nullable = false, length = 20)
    private String alertSound;

    /** ACCEPTED / REJECTED / FAILED / BLOCKED */
    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "cast_id", length = 50)
    private String castId;

    @Column(name = "result_message", length = 200)
    private String resultMessage;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    protected VoiceCastRecord() {
    }

    public VoiceCastRecord(String source, String title, String content, String alertSound, String status,
                           String castId, String resultMessage, LocalDateTime requestedAt,
                           LocalDateTime respondedAt) {
        this.source = source;
        this.title = title;
        this.content = content;
        this.alertSound = alertSound;
        this.status = status;
        this.castId = castId;
        this.resultMessage = resultMessage;
        this.requestedAt = requestedAt;
        this.respondedAt = respondedAt;
    }

    public Long getId() {
        return id;
    }

    public String getSource() {
        return source;
    }

    public Long getCapMessageId() {
        return capMessageId;
    }

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }

    public String getAlertSound() {
        return alertSound;
    }

    public String getStatus() {
        return status;
    }

    public String getCastId() {
        return castId;
    }

    public String getResultMessage() {
        return resultMessage;
    }

    public LocalDateTime getRequestedAt() {
        return requestedAt;
    }

    public LocalDateTime getRespondedAt() {
        return respondedAt;
    }
}
