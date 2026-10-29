package com.eseict.ulsan.server.sw.snmp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** MAC 테이블 현재값. 어느 포트에 어떤 장비가 붙어 있는지. */
@Entity
@Table(name = "sw_mac", schema = "server")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SwMac {

    @Id
    @Column(length = 17)
    private String mac;

    @Column(name = "if_name", nullable = false, length = 16)
    private String ifName;

    @Column(name = "seen_at", nullable = false)
    private OffsetDateTime seenAt;

    SwMac(String mac, String ifName, OffsetDateTime seenAt) {
        this.mac = mac;
        this.ifName = ifName;
        this.seenAt = seenAt;
    }
}
