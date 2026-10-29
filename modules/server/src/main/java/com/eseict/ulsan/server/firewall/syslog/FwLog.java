package com.eseict.ulsan.server.firewall.syslog;

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

/** 방화벽 Syslog 한 줄 원문. tag 로 종류를 구분한다 (resource_cnt / fw4_traffic_cnt / audit …). */
@Entity
@Table(name = "fw_log", schema = "server")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FwLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "received_at", nullable = false)
    private OffsetDateTime receivedAt;

    /** 방화벽이 찍은 시각. 수집 서버와 몇 초 다를 수 있다. */
    @Column(name = "device_at")
    private OffsetDateTime deviceAt;

    @Column(nullable = false, length = 32)
    private String tag;

    @Column(nullable = false)
    private String body;

    @Builder
    FwLog(OffsetDateTime receivedAt, OffsetDateTime deviceAt, String tag, String body) {
        this.receivedAt = receivedAt;
        this.deviceAt = deviceAt;
        this.tag = tag;
        this.body = body;
    }
}
