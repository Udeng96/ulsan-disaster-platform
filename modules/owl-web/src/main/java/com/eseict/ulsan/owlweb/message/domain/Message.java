package com.eseict.ulsan.owlweb.message.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 부엉이 상황전파 메시지 (행안부 상황전파 표준 API 의 MsgInfo 수신본).
 *
 * <p>{@code (msgId, msgSn)} 복합 UNIQUE — 같은 건이 다시 오면 저장하지 않는다
 * (한 번 저장한 메시지는 수정하지 않는다).
 * 저장 필드는 문서 기준으로 관제에 필요한 것만 선별. 매핑(주소 fallback, 일시 파싱,
 * msgType enum 변환)은 ingest 단계에서 수행하고 엔티티는 결과값만 보관한다.
 */
@Entity
@Table(name = "message", schema = "owl")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "msg_id", nullable = false, length = 20)
    private String msgId;

    @Column(name = "msg_sn", nullable = false, length = 22)
    private String msgSn;

    @Column(name = "send_dtm")
    private LocalDateTime sendDtm;

    @Enumerated(EnumType.STRING)
    @Column(name = "msg_type", nullable = false, length = 30)
    private MsgType msgType;

    @Column(name = "disaster_type_code", length = 15)
    private String disasterTypeCode;

    @Column(name = "disaster_type_name", length = 200)
    private String disasterTypeName;

    @Column(length = 300)
    private String title;

    @Column(name = "occur_dtm")
    private LocalDateTime occurDtm;

    @Column(name = "end_status", length = 10)
    private String endStatus;

    /** 행정동 ({@code common.region.id}). 저장 시 regionName 으로 찾고, 못 찾으면 null. 지역 필터 키. */
    @Column(name = "region_id")
    private Long regionId;

    @Column(name = "region_name", length = 50)
    private String regionName;

    @Column(length = 500)
    private String addr;

    @Column(name = "road_addr", length = 500)
    private String roadAddr;

    @Column(precision = 19, scale = 6)
    private BigDecimal lat;

    @Column(precision = 19, scale = 6)
    private BigDecimal lng;

    @Column(columnDefinition = "TEXT")
    private String summary;

    /** 재난유형 대분류 코드 — 소분류 코드에서 역산해 적재 시 채운다. 종류 필터 키. */
    @Column(name = "disaster_type_group", length = 1)
    private String disasterTypeGroup;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    private Message(String msgId, String msgSn, LocalDateTime sendDtm, MsgType msgType,
                    String disasterTypeCode, String disasterTypeName, String title,
                    LocalDateTime occurDtm, String endStatus, Long regionId, String regionName,
                    String addr, String roadAddr, BigDecimal lat, BigDecimal lng,
                    String summary, String disasterTypeGroup) {
        this.msgId = msgId;
        this.msgSn = msgSn;
        this.sendDtm = sendDtm;
        this.msgType = msgType;
        this.disasterTypeCode = disasterTypeCode;
        this.disasterTypeName = disasterTypeName;
        this.title = title;
        this.occurDtm = occurDtm;
        this.endStatus = endStatus;
        this.regionId = regionId;
        this.regionName = regionName;
        this.addr = addr;
        this.roadAddr = roadAddr;
        this.lat = lat;
        this.lng = lng;
        this.summary = summary;
        this.disasterTypeGroup = disasterTypeGroup;
    }

    /** 수신 메시지를 엔티티로. 매핑은 ingest 에서 끝낸 값을 받는다. */
    public static Message of(String msgId, String msgSn, LocalDateTime sendDtm, MsgType msgType,
                             String disasterTypeCode, String disasterTypeName, String title,
                             LocalDateTime occurDtm, String endStatus, Long regionId,
                             String regionName, String addr, String roadAddr,
                             BigDecimal lat, BigDecimal lng, String summary,
                             String disasterTypeGroup) {
        return new Message(msgId, msgSn, sendDtm, msgType, disasterTypeCode, disasterTypeName,
                title, occurDtm, endStatus, regionId, regionName, addr, roadAddr, lat, lng,
                summary, disasterTypeGroup);
    }

}
