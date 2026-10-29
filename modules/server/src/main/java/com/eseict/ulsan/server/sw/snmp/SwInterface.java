package com.eseict.ulsan.server.sw.snmp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 10초마다 읽은 스위치 포트 하나. bps 는 직전 샘플과의 차이. */
@Entity
@Table(name = "sw_interface", schema = "server")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SwInterface {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "collected_at", nullable = false)
    private OffsetDateTime collectedAt;

    @Column(name = "if_index", nullable = false)
    private int ifIndex;

    @Column(name = "if_name", nullable = false, length = 16)
    private String ifName;

    @Column(name = "link_up", nullable = false)
    private boolean linkUp;

    @Column(name = "speed_mbps")
    private Integer speedMbps;

    @Column(name = "in_bytes", nullable = false)
    private long inBytes;

    @Column(name = "out_bytes", nullable = false)
    private long outBytes;

    @Column(name = "in_bps")
    private Long inBps;

    @Column(name = "out_bps")
    private Long outBps;

    /** 받기 에러 누적 (ifInErrors). 스위치가 재시작하면 0 부터 다시. */
    @Column(name = "in_errors")
    private Long inErrors;

    /** 보내기 에러 누적 (ifOutErrors). */
    @Column(name = "out_errors")
    private Long outErrors;

    /** 받은 패킷 누적 (유니·멀티·브로드캐스트 합). */
    @Column(name = "in_pkts")
    private Long inPkts;

    /** 받은 브로드캐스트 누적. */
    @Column(name = "in_bcast")
    private Long inBcast;

    /** 받은 패킷/초 (직전 샘플 차이). */
    @Column(name = "in_pps")
    private Long inPps;

    /** 받은 브로드캐스트/초. bcast_pps ÷ in_pps = 브로드캐스트 비율. */
    @Column(name = "bcast_pps")
    private Long bcastPps;

    @Builder
    SwInterface(OffsetDateTime collectedAt, int ifIndex, String ifName, boolean linkUp, Integer speedMbps,
                long inBytes, long outBytes, Long inBps, Long outBps, Long inErrors, Long outErrors,
                Long inPkts, Long inBcast, Long inPps, Long bcastPps) {
        this.collectedAt = collectedAt;
        this.ifIndex = ifIndex;
        this.ifName = ifName;
        this.linkUp = linkUp;
        this.speedMbps = speedMbps;
        this.inBytes = inBytes;
        this.outBytes = outBytes;
        this.inBps = inBps;
        this.outBps = outBps;
        this.inErrors = inErrors;
        this.outErrors = outErrors;
        this.inPkts = inPkts;
        this.inBcast = inBcast;
        this.inPps = inPps;
        this.bcastPps = bcastPps;
    }

    /** 받기 + 보내기 에러 누적. 둘 다 없으면 null. */
    public Long totalErrors() {
        return inErrors == null && outErrors == null ? null
                : (inErrors == null ? 0 : inErrors) + (outErrors == null ? 0 : outErrors);
    }
}
