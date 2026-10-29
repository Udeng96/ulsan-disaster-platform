package com.eseict.ulsan.earthquake.instrument;

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
 * 지진 계측기.
 *
 * <p>울산 관측망({@code net = US}) 계측기 4대. 업체에서 받은 정보로 적재한다.
 */
@Entity
@Table(name = "instrument", schema = "earthquake")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Instrument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 관측망 코드 (울산 US). 실시간 API 매핑 키. */
    @Column(nullable = false, length = 8)
    private String net;

    /** 관측소 코드. 실시간 API 매핑 키. */
    @Column(nullable = false, length = 8)
    private String obs;

    /** {@code net}+{@code obs} 조합 (예: US_NGG). */
    @Column(name = "station_code", nullable = false, unique = true, length = 16)
    private String stationCode;

    /** 설치위치 — 가상시설0683 / 가상시설0714 / 가상시설0715. */
    @Column(name = "install_location", nullable = false, length = 16)
    private String installLocation;

    /** 축 구분. 세부축은 지정된 경우만 표기한다 (예: {@code 3축}, {@code 2축(Y,X)}). */
    @Column(nullable = false, length = 16)
    private String axis;

    @Column(name = "model_name", nullable = false, length = 32)
    private String modelName;

    @Column(name = "serial_no", nullable = false, unique = true, length = 32)
    private String serialNo;

    @Column(name = "connection_type", nullable = false, length = 32)
    private String connectionType;

    /** 위도. 현재 4대 전건이 남구청 위치 임시값 — 실제 설치 좌표 수령 전. */
    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal lat;

    /** 경도. 현재 4대 전건이 남구청 위치 임시값 — 실제 설치 좌표 수령 전. */
    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal lng;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
