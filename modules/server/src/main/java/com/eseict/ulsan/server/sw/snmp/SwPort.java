package com.eseict.ulsan.server.sw.snmp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 포트 ↔ 장비 대응. 사람이 관리 (V2 시드). */
@Entity
@Table(name = "sw_port", schema = "server")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SwPort {

    @Id
    @Column(name = "if_name", length = 16)
    private String ifName;

    @Column(name = "sort_no", nullable = false)
    private short sortNo;

    /** server.servers.host. 장비가 꽂힌 포트만 값이 있다. */
    @Column(length = 64)
    private String host;

    @Column(length = 128)
    private String note;
}
