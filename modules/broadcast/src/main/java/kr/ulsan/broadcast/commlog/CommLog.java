package kr.ulsan.broadcast.commlog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/** 외부 통신 원문 로그 ({@code comm_log}). 자동음성·전광판 공통, 1개월 보관. */
@Entity
@Table(name = "comm_log")
public class CommLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** VOICE / SIGNBOARD */
    @Column(nullable = false, length = 10)
    private String channel;

    /** OUT(우리가 보냄) / IN(외부에서 받음) */
    @Column(nullable = false, length = 3)
    private String direction;

    /** VENDOR / BOARD / CAP */
    @Column(name = "peer_type", nullable = false, length = 10)
    private String peerType;

    @Column(nullable = false, length = 200)
    private String peer;

    @Column(name = "request_word", length = 50)
    private String requestWord;

    @Column(name = "request_body", columnDefinition = "TEXT")
    private String requestBody;

    @Column(name = "response_body", columnDefinition = "TEXT")
    private String responseBody;

    @Column(nullable = false)
    private boolean success;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "elapsed_ms")
    private Integer elapsedMs;

    @Column(name = "ref_table", length = 50)
    private String refTable;

    @Column(name = "ref_id")
    private Long refId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected CommLog() {
    }

    public CommLog(String channel, String direction, String peerType, String peer, String requestWord,
                   String requestBody, String responseBody, boolean success, String errorMessage,
                   Integer elapsedMs, String refTable, Long refId, LocalDateTime createdAt) {
        this.channel = channel;
        this.direction = direction;
        this.peerType = peerType;
        this.peer = peer;
        this.requestWord = requestWord;
        this.requestBody = requestBody;
        this.responseBody = responseBody;
        this.success = success;
        this.errorMessage = errorMessage;
        this.elapsedMs = elapsedMs;
        this.refTable = refTable;
        this.refId = refId;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getChannel() {
        return channel;
    }

    public String getDirection() {
        return direction;
    }

    public String getPeerType() {
        return peerType;
    }

    public String getPeer() {
        return peer;
    }

    public String getRequestWord() {
        return requestWord;
    }

    public String getRequestBody() {
        return requestBody;
    }

    public String getResponseBody() {
        return responseBody;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public Integer getElapsedMs() {
        return elapsedMs;
    }

    public String getRefTable() {
        return refTable;
    }

    public Long getRefId() {
        return refId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
