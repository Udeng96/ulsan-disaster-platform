package com.eseict.ulsan.earthquake.event;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
 * 지진 이벤트 — 업체 {@code v_evt_all} 적재본.
 *
 * <p>기상청 통보와 현장 트리거가 한 테이블에 있다. 둘을 시각으로 대조하는 것이 이 도메인의
 * 핵심이라, 나누지 않고 {@code evtType} 으로 구분한다.
 *
 * <p><b>종류에 따라 비는 컬럼이 있는 것이 정상이다.</b> 기상청은 규모·진앙이, 현장은 계측시설·
 * PGA 가 채워진다.
 */
@Entity
@Table(name = "event", schema = "earthquake")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 이벤트 종류 — {@code K} 기상청 통보 / {@code H} 현장 트리거 (2026-08-26 실DB 확인). */
    @Column(name = "evt_type", nullable = false, length = 1)
    private String evtType;

    @Column(name = "evt_id", nullable = false, length = 14)
    private String evtId;

    /** 발생시각 — 진원시(기상청) 또는 트리거 시각(현장). */
    @Column(name = "evt_time")
    private LocalDateTime evtTime;

    @Column(length = 8)
    private String net;

    /** 계측시설 코드 (예: NG). instrument 의 obs(NGG 등)보다 상위 단위다. */
    @Column(name = "obs_id", length = 8)
    private String obsId;

    /** 계측시설명 (예: 울산 남구청). */
    @Column(name = "obs_name", length = 30)
    private String obsName;

    /** 현장 트리거의 최대가속도(gal). 기상청 이벤트는 null. */
    @Column(name = "pga_val", precision = 12, scale = 6)
    private BigDecimal pgaVal;

    /** 규모. 현장 트리거는 null. */
    @Column(precision = 4, scale = 2)
    private BigDecimal magnitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal lat;

    /** 업체 컬럼명은 lon — 형제 모듈 컨벤션에 맞춰 lng. */
    @Column(precision = 10, scale = 7)
    private BigDecimal lng;

    @Column(name = "origin_area", length = 100)
    private String originArea;

    /** 업체 DB 등록시각 — 증분 수집 기준. 우리 적재시각(createdAt)과 다르다. */
    @Column(name = "source_regdate", nullable = false)
    private LocalDateTime sourceRegdate;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    static Event from(EventRow row) {
        Event event = new Event();
        event.evtType = row.evtType();
        event.evtId = row.evtId();
        event.net = row.net();
        event.obsId = row.obsId();
        event.apply(row);
        return event;
    }

    /** 업체 쪽에서 값이 갱신될 수 있으므로 재수집 시 덮어쓴다. 자연키는 안 바꾼다. */
    void apply(EventRow row) {
        this.evtTime = row.evtTime();
        this.obsName = row.obsName();
        this.pgaVal = row.pgaVal();
        this.magnitude = row.mag();
        this.lat = row.lat();
        this.lng = row.lon();
        this.originArea = row.originArea();
        this.sourceRegdate = row.regDate();
    }
}
