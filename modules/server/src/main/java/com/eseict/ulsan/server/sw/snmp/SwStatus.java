package com.eseict.ulsan.server.sw.snmp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 10초마다 읽은 스위치 상태 한 줄. */
@Entity
@Table(name = "sw_status", schema = "server")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SwStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "collected_at", nullable = false)
    private OffsetDateTime collectedAt;

    @Column(name = "uptime_sec")
    private Long uptimeSec;

    @Column(name = "load_1m", precision = 6, scale = 2)
    private BigDecimal load1m;

    @Column(name = "mem_total_kb")
    private Long memTotalKb;

    @Column(name = "mem_used_kb")
    private Long memUsedKb;

    @Column(name = "rtt_ms")
    private Integer rttMs;

    @Builder
    SwStatus(OffsetDateTime collectedAt, Long uptimeSec, BigDecimal load1m, Long memTotalKb, Long memUsedKb, Integer rttMs) {
        this.collectedAt = collectedAt;
        this.uptimeSec = uptimeSec;
        this.load1m = load1m;
        this.memTotalKb = memTotalKb;
        this.memUsedKb = memUsedKb;
        this.rttMs = rttMs;
    }
}
