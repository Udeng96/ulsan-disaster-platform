package com.eseict.ulsan.slope.facility;

import com.eseict.ulsan.slope.common.region.Region;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
 * 급경사지 관리대장 (관리지역).
 *
 * <p>남구 급경사지 90개소. 해빙기 안전점검 대조표 기준이며, 계측기 설치 여부와 무관하게
 * 관리 대상 전체를 담는다. 계측기가 설치된 3곳은 {@link SlopeArea} 로 별도 관리된다
 * (관리번호 3114000019 / 3114000027 / 3114000090 이 각각 가상시설0553 / 가상시설0680 / 가상시설0432).
 */
@Entity
@Table(name = "managed_area", schema = "slope")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ManagedArea {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 급경사지 관리번호 (자연키). */
    @Column(name = "mgmt_no", nullable = false, unique = true, length = 20)
    private String mgmtNo;

    @Column(nullable = false, length = 200)
    private String name;

    /** 법정동 — 원본 대장 값 그대로. */
    @Column(name = "legal_dong", length = 50)
    private String legalDong;

    @Column(name = "legal_dong_code", length = 10)
    private String legalDongCode;

    @Column(length = 50)
    private String jibun;

    @Column(precision = 10, scale = 7)
    private BigDecimal lat;

    @Column(precision = 10, scale = 7)
    private BigDecimal lng;

    /** 행정동 — 법정동을 좌표 기준으로 변환한 결과. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id")
    private Region region;

    /** 평가등급 A~E. 엑셀 업로드로 바꾼다 ({@link ManagedAreaGradeService}). 업로드 전에는 임시값 'A'. */
    @Column(length = 10)
    private String grade;

    /** 관리기관. */
    @Column(length = 100)
    private String org;

    /** 관리부서. 기관에 부서 구분이 없으면 null. */
    @Column(length = 100)
    private String department;

    /** 좌표 교체·법정동 확인필요 등 데이터 이력. */
    @Column(length = 500)
    private String remark;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    /** @return 실제로 바뀌었으면 true */
    public boolean changeGrade(String grade) {
        if (grade.equals(this.grade)) {
            return false;
        }
        this.grade = grade;
        return true;
    }
}
