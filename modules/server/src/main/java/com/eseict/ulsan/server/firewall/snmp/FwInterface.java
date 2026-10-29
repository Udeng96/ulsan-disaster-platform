package com.eseict.ulsan.server.firewall.snmp;

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

/** 10초마다 읽은 포트 하나의 상태·누적 카운터. bps 는 직전 샘플과의 차이. */
@Entity
@Table(name = "fw_interface", schema = "server")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FwInterface {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "collected_at", nullable = false)
    private OffsetDateTime collectedAt;

    @Column(name = "if_name", nullable = false, length = 16)
    private String ifName;

    @Column(length = 16)
    private String zone;

    @Column(name = "link_up", nullable = false)
    private boolean linkUp;

    @Column(length = 16)
    private String speed;

    @Column(length = 16)
    private String duplex;

    @Column(name = "in_bytes", nullable = false)
    private long inBytes;

    @Column(name = "out_bytes", nullable = false)
    private long outBytes;

    @Column(name = "in_bps")
    private Long inBps;

    @Column(name = "out_bps")
    private Long outBps;

    @Builder
    FwInterface(OffsetDateTime collectedAt, String ifName, String zone, boolean linkUp, String speed,
                String duplex, long inBytes, long outBytes, Long inBps, Long outBps) {
        this.collectedAt = collectedAt;
        this.ifName = ifName;
        this.zone = zone;
        this.linkUp = linkUp;
        this.speed = speed;
        this.duplex = duplex;
        this.inBytes = inBytes;
        this.outBytes = outBytes;
        this.inBps = inBps;
        this.outBps = outBps;
    }
}
