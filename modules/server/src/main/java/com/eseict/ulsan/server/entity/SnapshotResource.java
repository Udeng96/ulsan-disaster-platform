package com.eseict.ulsan.server.entity;

import com.eseict.ulsan.server.domain.ResourceKind;
import com.eseict.ulsan.server.domain.ResourceReading;
import jakarta.persistence.*;

/** 자원 동그라미 칸 하나 = 1행. 측정 1회에 4행 (slot 1~4). */
@Entity
@Table(name = "snapshot_resources", schema = "server")
public class SnapshotResource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "snapshot_id", nullable = false)
    private ServerSnapshot snapshot;

    /** 1 위왼쪽 · 2 위오른쪽 · 3 아래왼쪽 · 4 아래오른쪽 */
    @Column(nullable = false)
    private short slot;

    @Column(nullable = false, length = 16) private String kind;
    @Column(nullable = false, length = 16) private String label;
    private Double pct;
    @Column(length = 64) private String detail;
    @Column(name = "warn_pct") private Double warnPct;
    @Column(name = "fail_pct") private Double failPct;

    protected SnapshotResource() {}

    SnapshotResource(ServerSnapshot snapshot, int slot, ResourceReading r) {
        this.snapshot = snapshot;
        this.slot = (short) slot;
        this.kind = r.kind().name();
        this.label = r.label();
        this.pct = r.pct();
        this.detail = r.detail();
        this.warnPct = r.warnPct();
        this.failPct = r.failPct();
    }

    public ResourceReading toDomain() {
        return new ResourceReading(ResourceKind.valueOf(kind), label, pct, detail, warnPct, failPct);
    }

    public short getSlot() { return slot; }
}
