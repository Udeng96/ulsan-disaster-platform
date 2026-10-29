package com.eseict.warning.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.OffsetDateTime;

/**
 * 기상특보 1건.
 * 한 특보가 발표/변경/해제될 때마다 KMA에서 새 tmFc(발표시각)로 잡힘.
 * (stnId + tmFc + title) 조합으로 유니크 처리.
 */
@Entity
@Table(
        name = "warning",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_warning_stn_tmfc_title",
                columnNames = {"stn_id", "tm_fc", "title"}
        ),
        indexes = @Index(
                name = "ix_warning_stn_tmfc",
                columnList = "stn_id, tm_fc DESC"
        )
)
public class Warning {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "stn_id", nullable = false, length = 8)
    private String stnId;            // "159" (울산)

    @Column(name = "stn_name", length = 32)
    private String stnName;          // "울산"

    @Column(name = "tm_fc", nullable = false)
    private OffsetDateTime tmFc;     // 발표시각

    @Column(nullable = false, length = 64)
    private String title;            // "건조주의보" 등

    @Column(columnDefinition = "text")
    private String content;          // 본문/내용 (있으면)

    @Column(name = "fetched_at", nullable = false)
    private OffsetDateTime fetchedAt;

    protected Warning() {
    }

    public Warning(String stnId, String stnName, OffsetDateTime tmFc,
                   String title, String content, OffsetDateTime fetchedAt) {
        this.stnId = stnId;
        this.stnName = stnName;
        this.tmFc = tmFc;
        this.title = title;
        this.content = content;
        this.fetchedAt = fetchedAt;
    }

    public Long getId() { return id; }
    public String getStnId() { return stnId; }
    public String getStnName() { return stnName; }
    public OffsetDateTime getTmFc() { return tmFc; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public OffsetDateTime getFetchedAt() { return fetchedAt; }
}
