package com.eseict.ulsan.server.firewall.snmp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 포트 라벨(UTP1…)과 용도·반대편 장비. 사람이 넣는 값 (V3 시드). */
@Entity
@Table(name = "fw_port", schema = "server")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FwPort {

    @Id
    @Column(name = "if_name", length = 16)
    private String ifName;

    @Column(nullable = false, length = 16)
    private String label;

    @Column(name = "sort_no", nullable = false)
    private short sortNo;

    @Column(length = 64)
    private String usage;

    @Column(length = 64)
    private String peer;
}
