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
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 계측기 48대 — 업체 {@code ews.obsv} + {@code ews.obsv_man}.
 *
 * <p>이름이 두 벌이다.
 * <ul>
 *   <li>{@code sourceName} — {@code 삼익_수집1_경사_함수-1}. 업체 원본. 데이터 대조용</li>
 *   <li>{@code displayName} — {@code 수집1 - 1}. 화면 표출용. 지구명·종류를 뺀 것</li>
 * </ul>
 *
 * <p>{@code displayNo} 를 따로 두는 이유 — 표출명으로 정렬하면 문자열 비교라
 * {@code 수집1 - 10} 이 {@code 수집1 - 2} 앞에 온다. 가상시설0680이 11번까지 있어 실제로 발생한다.
 *
 * <p>{@code spotNo}·{@code address} 는 업체 {@code obsv_man} 에서 온다. 1:1 이고 우리가 쓰는
 * 것이 둘뿐이라 별도 테이블로 두지 않고 흡수했다.
 */
@Entity
@Table(name = "instrument", schema = "slope")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Instrument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 업체 {@code obsv_id}. */
    @Column(name = "vendor_id", nullable = false, unique = true)
    private Long vendorId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "area_id", nullable = false)
    private SlopeArea area;

    @Column(name = "source_name", nullable = false, length = 100)
    private String sourceName;

    @Column(name = "display_name", nullable = false, length = 50)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private InstrumentCategory category;

    /** 수집기. 업체 {@code gid} 에 대응하며 지구당 2대다. */
    @Column(length = 20)
    private String collector;

    @Column(name = "display_no")
    private Integer displayNo;

    private BigDecimal lat;
    private BigDecimal lng;

    /** 국가지점번호. 업체 {@code obsv_man.spo_no_cd} (예: 마마65362668). */
    @Column(name = "spot_no", length = 12)
    private String spotNo;

    /** 설치주소. 업체 {@code obsv_man.dtl_adres}. */
    @Column(length = 300)
    private String address;

    /** 등록일자. 업체는 48대 전부 2024-07-09 로 같다 — 시스템 구축일이다. */
    @Column(name = "installed_at")
    private LocalDateTime installedAt;

    @Column(name = "use_yn", nullable = false)
    private boolean useYn = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Instrument(Long vendorId, SlopeArea area, String sourceName, String displayName,
                      InstrumentCategory category, String collector, Integer displayNo,
                      BigDecimal lat, BigDecimal lng, String spotNo, String address,
                      LocalDateTime installedAt) {
        this.vendorId = vendorId;
        this.area = area;
        this.sourceName = sourceName;
        this.displayName = displayName;
        this.category = category;
        this.collector = collector;
        this.displayNo = displayNo;
        this.lat = lat;
        this.lng = lng;
        this.spotNo = spotNo;
        this.address = address;
        this.installedAt = installedAt;
    }

    /**
     * 업체 계측기명에서 표출명을 만든다.
     *
     * <p>{@code 지구_수집기_종류-번호} 규칙에서 지구와 종류를 뺀다.
     * {@code 삼익_수집1_경사_함수-1} → {@code 수집1 - 1}.
     * {@code 가상시설0680_수집1__낙석감지기-10} 처럼 언더바가 겹친 경우도 두 번째 조각을 집으므로
     * 문제없다.
     */
    public static String toDisplayName(String sourceName) {
        return collectorOf(sourceName) + " - " + displayNoOf(sourceName);
    }

    /** {@code 삼익_수집1_경사_함수-1} → {@code 수집1} */
    public static String collectorOf(String sourceName) {
        String[] parts = sourceName.split("_");
        return parts.length >= 2 ? parts[1] : sourceName;
    }

    /** {@code 삼익_수집1_경사_함수-1} → {@code 1}. 없으면 null. */
    public static Integer displayNoOf(String sourceName) {
        int dash = sourceName.lastIndexOf('-');
        if (dash < 0) {
            return null;
        }
        try {
            return Integer.valueOf(sourceName.substring(dash + 1).trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
