package com.eseict.ulsan.server.sw.snmp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 「아는 장비」 MAC. 여기 없는 MAC 이 포트에 보이면 미확인 장비로 표시한다. */
@Entity
@Table(name = "sw_known_mac", schema = "server")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SwKnownMac {

    @Id
    @Column(length = 17)
    private String mac;

    @Column(name = "if_name", length = 16)
    private String ifName;

    @Column(length = 128)
    private String note;

    @Column(name = "registered_at", nullable = false)
    private OffsetDateTime registeredAt;

    public SwKnownMac(String mac, String ifName, String note, OffsetDateTime registeredAt) {
        this.mac = mac;
        this.ifName = ifName;
        this.note = note;
        this.registeredAt = registeredAt;
    }
}
