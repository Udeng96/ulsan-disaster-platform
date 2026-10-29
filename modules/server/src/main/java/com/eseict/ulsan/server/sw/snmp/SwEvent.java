package com.eseict.ulsan.server.sw.snmp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 포트 변화 한 줄 (⑥ 최근 활동). 루핑·ARP 로그를 받게 되면 같은 목록에 섞는다. */
@Entity
@Table(name = "sw_event", schema = "server")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SwEvent {

    public enum Kind { ERROR, LINK_UP, LINK_DOWN, NEW_MAC }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private OffsetDateTime at;

    @Column(name = "if_name", nullable = false, length = 16)
    private String ifName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Kind kind;

    @Column(nullable = false, length = 128)
    private String detail;

    public SwEvent(OffsetDateTime at, String ifName, Kind kind, String detail) {
        this.at = at;
        this.ifName = ifName;
        this.kind = kind;
        this.detail = detail;
    }
}
