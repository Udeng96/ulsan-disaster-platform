package com.eseict.ulsan.server.entity;

import com.eseict.ulsan.server.domain.KeyMetricSample;
import com.eseict.ulsan.server.domain.Snapshot;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * 측정 1회 = 1행. 수집기가 쓰고 화면이 읽는다. 최신 1행만 화면에 쓰이고 나머지는 이력.
 * 자원 동그라미 4칸은 snapshot_resources 에 칸마다 1행 (같이 저장되고, 이 행이 지워지면 DB 가 같이 지운다).
 * 비밀값(키·비밀번호)은 어떤 열에도 넣지 않는다 — 수집 명령 자체가 그런 값을 읽지 않는다.
 */
@Entity
@Table(name = "server_snapshots", schema = "server")
public class ServerSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "server_id", nullable = false)
    private Server server;

    /** 값을 잰 시각. */
    @Column(name = "measured_at", nullable = false)
    private Instant measuredAt;

    /** 장비를 실제로 읽은 시각. 「갱신 HH:MM:SS」와 오래됨 판정의 기준. */
    @Column(name = "collected_at", nullable = false)
    private Instant collectedAt;

    /** SNAPSHOT(시트 재생) · SSH · SNMP · INDIRECT · MANUAL */
    @Column(nullable = false, length = 16)
    private String source;

    @Column(name = "uptime_days") private Double uptimeDays;
    @Column(name = "nic_links", length = 255) private String nicLinks;
    @Column(length = 255) private String services;

    @Column(name = "key_value") private Double keyValue;
    @Column(name = "key_total") private Double keyTotal;
    @Column(name = "key_baseline") private Double keyBaseline;
    @Column(name = "key_aux", length = 255) private String keyAux;
    @Column(name = "last_activity_at") private Instant lastActivityAt;

    @Column(columnDefinition = "text") private String note;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "snapshot", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("slot")
    private List<SnapshotResource> resources = new ArrayList<>();

    protected ServerSnapshot() {}

    public ServerSnapshot(Server server, Snapshot s) {
        this.server = server;
        this.measuredAt = s.measuredAt();
        this.collectedAt = s.collectedAt();
        this.source = s.source();
        this.uptimeDays = s.uptimeDays();
        this.nicLinks = s.nicLinks();
        this.services = s.services();
        KeyMetricSample k = s.keyMetric();
        this.keyValue = k.value(); this.keyTotal = k.total(); this.keyBaseline = k.baseline();
        this.keyAux = k.aux(); this.lastActivityAt = k.lastActivityAt();
        this.note = s.note();
        for (int i = 0; i < s.resources().size(); i++) {
            resources.add(new SnapshotResource(this, i + 1, s.resources().get(i)));
        }
    }

    /** 엔티티 → 도메인. 판정 엔진은 이쪽만 본다. */
    public Snapshot toDomain() {
        return new Snapshot(measuredAt, collectedAt, source, uptimeDays, nicLinks, services,
                resources.stream().map(SnapshotResource::toDomain).toList(),
                new KeyMetricSample(keyValue, keyTotal, keyBaseline, keyAux, lastActivityAt), note);
    }

    public Long getId() { return id; }
    public Server getServer() { return server; }
    public Instant getMeasuredAt() { return measuredAt; }
    public Instant getCollectedAt() { return collectedAt; }
    public String getSource() { return source; }
}
