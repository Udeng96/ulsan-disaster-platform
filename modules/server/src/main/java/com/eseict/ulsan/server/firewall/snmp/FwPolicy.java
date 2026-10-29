package com.eseict.ulsan.server.firewall.snmp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 정책 표 현재값. 정책 인덱스로 덮어쓴다. */
@Entity
@Table(name = "fw_policy", schema = "server")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FwPolicy {

    @Id
    @Column(name = "policy_idx")
    private Integer policyIdx;

    @Column(nullable = false, length = 128)
    private String name;

    /** ALLOW / DENY */
    @Column(nullable = false, length = 8)
    private String action;

    @Column(nullable = false)
    private long packets;

    @Column(nullable = false)
    private long bytes;

    @Column(name = "session_cnt", nullable = false)
    private int sessionCnt;

    @Column(name = "last_hit_at")
    private OffsetDateTime lastHitAt;

    @Column(name = "collected_at", nullable = false)
    private OffsetDateTime collectedAt;

    @Builder
    FwPolicy(Integer policyIdx, String name, String action, long packets, long bytes, int sessionCnt,
             OffsetDateTime lastHitAt, OffsetDateTime collectedAt) {
        this.policyIdx = policyIdx;
        this.name = name;
        this.action = action;
        this.packets = packets;
        this.bytes = bytes;
        this.sessionCnt = sessionCnt;
        this.lastHitAt = lastHitAt;
        this.collectedAt = collectedAt;
    }
}
