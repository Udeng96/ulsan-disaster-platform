package com.eseict.ulsan.server.entity;

import com.eseict.ulsan.server.domain.KeyMetricRule;
import com.eseict.ulsan.server.domain.MeasureMode;
import com.eseict.ulsan.server.domain.ResourceLayout;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;

/**
 * 자산대장 「관리·계약」 탭 한 행 = 서버 한 대. 바뀌지 않는 정보만 둔다(정중동).
 * 키는 {@code host}. 연번(seq)은 랙 위→아래 표시 순서일 뿐이다 — 한 대가 빠지면 연번은 밀리지만 host 는 안 바뀐다.
 */
@Entity
@Table(name = "servers", schema = "server")
public class Server {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Integer seq;

    /** 호스트명 / 시스템명. 1·2번(방화벽·스위치)은 리눅스 호스트명이 없어 시스템명을 넣는다. */
    @Column(nullable = false, unique = true, length = 64)
    private String host;

    /** 현장(hostnamectl · 장비 WebUI)에서 확인했는가. false 면 화면에 노랑 「확인 필요」. */
    @Column(name = "host_confirmed", nullable = false)
    private boolean hostConfirmed;

    @Column(nullable = false, length = 64)
    private String name;

    /** 메인 카드용 짧은 이름 (13번 「(전파) 상황전파」). */
    @Column(name = "short_name", nullable = false, length = 32)
    private String shortName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Category category;

    @Column(nullable = false, length = 32)
    private String ip;

    @Column(name = "network_name", nullable = false, length = 32)
    private String networkName;

    @Column(nullable = false, length = 64)
    private String manager;

    @Column(length = 128)
    private String model;

    @Column(length = 64)
    private String maker;   // 제조사 (V8)

    @Column(name = "item_id", length = 64)
    private String itemId;

    @Column(name = "serial_no", length = 64)
    private String serialNo;

    @Column(name = "intro_date")
    private LocalDate introDate;

    @Column(length = 128)
    private String vendor;

    @Column(name = "vendor_tel", length = 32)
    private String vendorTel;

    /** 10·11번 SecureGate 1조처럼 짝이 있을 때. 접이식 「기본 정보」에만 표시(마스터 2026-10-06). */
    @Column(name = "set_name", length = 64)
    private String setName;

    @Enumerated(EnumType.STRING)
    @Column(name = "measure_mode", nullable = false, length = 16)
    private MeasureMode measureMode;

    /** 섹션1·4 도면 형상 A~G. */
    @Column(nullable = false, length = 1)
    private String shape;

    @Column(name = "rack_u", nullable = false)
    private Integer rackU;

    /** 메인 카드 ③줄 이름. */
    @Column(name = "key_metric_label", nullable = false, length = 32)
    private String keyMetricLabel;

    /** 메인 카드 ④줄 규칙. null 이면 「실측 대기」. */
    @Enumerated(EnumType.STRING)
    @Column(name = "key_rule", length = 32)
    private KeyMetricRule keyRule;

    /** 자원 동그라미 4칸 구성 (SERVER_DATA · SERVER_NET · FIREWALL · SWITCH). */
    @Enumerated(EnumType.STRING)
    @Column(name = "resource_layout", nullable = false, length = 16)
    private ResourceLayout resourceLayout;

    @Column(columnDefinition = "text")
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public enum Category { SECURITY, NETWORK, STORAGE, OPERATION, LINK, ALERT }

    protected Server() {}

    public Long getId() { return id; }
    public Integer getSeq() { return seq; }
    public String getHost() { return host; }
    public boolean isHostConfirmed() { return hostConfirmed; }
    public String getName() { return name; }
    public String getShortName() { return shortName; }
    public Category getCategory() { return category; }
    public String getIp() { return ip; }
    public String getNetworkName() { return networkName; }
    public String getManager() { return manager; }
    public String getModel() { return model; }
    public String getItemId() { return itemId; }
    public String getSerialNo() { return serialNo; }
    public String getMaker() { return maker; }
    public LocalDate getIntroDate() { return introDate; }
    public String getVendor() { return vendor; }
    public String getVendorTel() { return vendorTel; }
    public String getSetName() { return setName; }
    public MeasureMode getMeasureMode() { return measureMode; }
    public String getShape() { return shape; }
    public Integer getRackU() { return rackU; }
    public String getKeyMetricLabel() { return keyMetricLabel; }
    public KeyMetricRule getKeyRule() { return keyRule; }
    public ResourceLayout getResourceLayout() { return resourceLayout; }
    public String getNote() { return note; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
