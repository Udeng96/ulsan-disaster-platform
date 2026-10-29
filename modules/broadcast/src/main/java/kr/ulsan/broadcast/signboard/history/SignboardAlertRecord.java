package kr.ulsan.broadcast.signboard.history;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;

/** 전광판 알림 1건 ({@code signboard_alert}). 화면이 보낸 내용·대상과 모듈이 채운 값을 남긴다. */
@Entity
@Table(name = "signboard_alert")
public class SignboardAlertRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** SCREEN / CAP */
    @Column(nullable = false, length = 10)
    private String source;

    @Column(name = "cap_message_id")
    private Long capMessageId;

    @Column(nullable = false, length = 100)
    private String identifier;

    @Column(name = "msg_cn", nullable = false, columnDefinition = "TEXT")
    private String msgCn;

    @Column(name = "display_duration", nullable = false)
    private Integer displayDuration;

    @Column(nullable = false, length = 10)
    private String priority;

    @Column(name = "sub_type", length = 100)
    private String subType;

    @Column(name = "rcptn_rgn_nm", length = 200)
    private String rcptnRgnNm;

    @Column(length = 200)
    private String agency;

    /** 모듈이 채운 요청 시각 "yyyy-MM-dd HH:mm:ss" */
    @Column(name = "timestamp_kr", nullable = false, length = 19)
    private String timestampKr;

    /** 모듈이 채운 만료시각 "yyyy-MM-dd HH:mm:ss" (참고용, 전광판은 읽지 않음) */
    @Column(nullable = false, length = 19)
    private String expires;

    /** {@link #expires} 를 시각으로 바꾼 값 (한국시간) */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /** 받은 대상 전광판. null = 전체 */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "target_hosts")
    private List<String> targetHosts;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    protected SignboardAlertRecord() {
    }

    public SignboardAlertRecord(String source, String identifier, String msgCn, Integer displayDuration,
                                String priority, String subType, String rcptnRgnNm, String agency,
                                String timestampKr, String expires, LocalDateTime expiresAt,
                                List<String> targetHosts, LocalDateTime requestedAt) {
        this.source = source;
        this.identifier = identifier;
        this.msgCn = msgCn;
        this.displayDuration = displayDuration;
        this.priority = priority;
        this.subType = subType;
        this.rcptnRgnNm = rcptnRgnNm;
        this.agency = agency;
        this.timestampKr = timestampKr;
        this.expires = expires;
        this.expiresAt = expiresAt;
        this.targetHosts = targetHosts;
        this.requestedAt = requestedAt;
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

    public String getIdentifier() {
        return identifier;
    }

    public String getMsgCn() {
        return msgCn;
    }

    public Integer getDisplayDuration() {
        return displayDuration;
    }

    public String getPriority() {
        return priority;
    }

    public String getSubType() {
        return subType;
    }

    public String getRcptnRgnNm() {
        return rcptnRgnNm;
    }

    public String getAgency() {
        return agency;
    }

    public String getTimestampKr() {
        return timestampKr;
    }

    public String getExpires() {
        return expires;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public List<String> getTargetHosts() {
        return targetHosts;
    }

    public LocalDateTime getRequestedAt() {
        return requestedAt;
    }
}
