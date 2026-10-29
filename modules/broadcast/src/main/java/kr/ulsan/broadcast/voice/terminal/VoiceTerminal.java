package kr.ulsan.broadcast.voice.terminal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import kr.ulsan.broadcast.region.Region;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 자동음성 단말 ({@code voice_terminal}). 아파트·경로당·하천 등에 설치된 방송 장비 1대.
 * 데이터는 DB 에 직접 넣고 모듈은 조회만 한다.
 */
@Entity
@Immutable
@Table(name = "voice_terminal")
public class VoiceTerminal {

    @Id
    private Long id;

    /** 단말 코드 (예: SGB129). */
    @Column(name = "terminal_code", nullable = false, length = 20)
    private String terminalCode;

    /** 장비명 (예: {@code 가상시설0003}). */
    @Column(nullable = false, length = 200)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "comm_type", nullable = false, length = 30)
    private CommType commType;

    @Column(length = 30)
    private String phone;

    @Column(length = 500)
    private String address;

    @Column(precision = 10, scale = 7)
    private BigDecimal lat;

    @Column(precision = 10, scale = 7)
    private BigDecimal lng;

    @Column(name = "installed_at")
    private LocalDate installedAt;

    @Column(length = 50)
    private String manufacturer;

    @Column(length = 50)
    private String model;

    /** 화면 트리 그룹 (아파트/경로당/어린이집/주민센터/태화강/… 14종). */
    @Column(name = "group_type", nullable = false, length = 30)
    private String groupType;

    /** 소속 행정동. 없을 수 있음. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id")
    private Region region;

    protected VoiceTerminal() {
    }

    public Long getId() {
        return id;
    }

    public String getTerminalCode() {
        return terminalCode;
    }

    public String getName() {
        return name;
    }

    public CommType getCommType() {
        return commType;
    }

    public String getPhone() {
        return phone;
    }

    public String getAddress() {
        return address;
    }

    public BigDecimal getLat() {
        return lat;
    }

    public BigDecimal getLng() {
        return lng;
    }

    public LocalDate getInstalledAt() {
        return installedAt;
    }

    public String getManufacturer() {
        return manufacturer;
    }

    public String getModel() {
        return model;
    }

    public String getGroupType() {
        return groupType;
    }

    public Region getRegion() {
        return region;
    }
}
