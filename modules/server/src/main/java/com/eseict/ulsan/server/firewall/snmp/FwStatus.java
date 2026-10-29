package com.eseict.ulsan.server.firewall.snmp;

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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** 10초마다 SNMP 로 읽은 방화벽 상태 한 줄. */
@Entity
@Table(name = "fw_status", schema = "server")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FwStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "collected_at", nullable = false)
    private OffsetDateTime collectedAt;

    @Column(name = "uptime_sec")
    private Long uptimeSec;

    @Column(name = "session_cnt")
    private Integer sessionCnt;

    @Column(name = "cpu_pct", precision = 5, scale = 1)
    private BigDecimal cpuPct;

    @Column(name = "mem_total")
    private Long memTotal;

    @Column(name = "mem_used")
    private Long memUsed;

    @Column(name = "mem_pct")
    private Short memPct;

    @Column(name = "disk_sys_pct")
    private Short diskSysPct;

    @Column(name = "disk_log_pct")
    private Short diskLogPct;

    @Column(name = "disk_tmp_pct")
    private Short diskTmpPct;

    @Column(name = "cpu_temp_c", precision = 5, scale = 1)
    private BigDecimal cpuTempC;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "fan_rpm")
    private Integer[] fanRpm;

    /** SNMP 왕복 시간. 화면 「응답」 자리. */
    @Column(name = "rtt_ms")
    private Integer rttMs;

    @Builder
    FwStatus(OffsetDateTime collectedAt, Long uptimeSec, Integer sessionCnt, BigDecimal cpuPct,
             Long memTotal, Long memUsed, Short memPct, Short diskSysPct, Short diskLogPct,
             Short diskTmpPct, BigDecimal cpuTempC, Integer[] fanRpm, Integer rttMs) {
        this.collectedAt = collectedAt;
        this.uptimeSec = uptimeSec;
        this.sessionCnt = sessionCnt;
        this.cpuPct = cpuPct;
        this.memTotal = memTotal;
        this.memUsed = memUsed;
        this.memPct = memPct;
        this.diskSysPct = diskSysPct;
        this.diskLogPct = diskLogPct;
        this.diskTmpPct = diskTmpPct;
        this.cpuTempC = cpuTempC;
        this.fanRpm = fanRpm;
        this.rttMs = rttMs;
    }
}
