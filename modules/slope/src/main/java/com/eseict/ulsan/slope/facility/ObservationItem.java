package com.eseict.ulsan.slope.facility;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 관측항목 70개 — 업체 {@code ews.obsv_item}. 값과 단계가 붙는 단위다.
 *
 * <p>계측기 하나가 여러 관측항목을 낸다. 경사계 22대가 경사계·토양함수비를 함께 낸다.
 *
 * <p><b>단계가 관측항목 단위라 같은 계측기 안에서도 어긋난다.</b> 22대 중 4대가 실제로
 * 경사계는 정상인데 토양함수비는 관심인 상태다. 화면 행 뱃지는 이 중 가장 나쁜 단계를 쓴다.

 *
 * <p>값·단계·마지막 수신 시각은 여기 두지 않는다. 화면이 업체 DB 를 직접 읽는다.
 */
@Entity
@Table(name = "observation_item", schema = "slope")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ObservationItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 업체 {@code obsv_item_id}. */
    @Column(name = "vendor_id", nullable = false, unique = true)
    private Long vendorId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "instrument_id", nullable = false)
    private Instrument instrument;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ObservationCategory category;

    /** ° / % / 회 / mm. 종류마다 고정이지만 업체 값을 그대로 보관한다. */
    @Column(nullable = false, length = 10)
    private String unit;

    @Column(name = "use_yn", nullable = false)
    private boolean useYn = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public ObservationItem(Long vendorId, Instrument instrument, ObservationCategory category, String unit) {
        this.vendorId = vendorId;
        this.instrument = instrument;
        this.category = category;
        this.unit = unit;
    }
}
