package kr.ulsan.broadcast.voice.template;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * 자동음성 문구 ({@code message_template}). 화면의 "메시지 유형" 버튼(한파주의보 등) — 누르면 제목·내용이 채워진다.
 * 버튼 이름은 {@link #title}. created_at·updated_at 은 모듈이 채운다(DB 트리거 없음).
 */
@Entity
@Table(name = "message_template")
public class MessageTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected MessageTemplate() {
    }

    public MessageTemplate(String title, String content, LocalDateTime now) {
        this.title = title;
        this.content = content;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void update(String title, String content, LocalDateTime now) {
        this.title = title;
        this.content = content;
        this.updatedAt = now;
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
