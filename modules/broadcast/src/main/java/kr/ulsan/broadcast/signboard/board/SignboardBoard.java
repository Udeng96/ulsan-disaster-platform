package kr.ulsan.broadcast.signboard.board;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import kr.ulsan.broadcast.region.Region;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;

/**
 * 재해문자전광판 ({@code signboard_board}). 데이터는 DB 에 직접 넣고 모듈은 조회만 한다.
 * id 는 cctv 모듈({@code cctv.cctv_menu.fac_id})이 참조한다.
 */
@Entity
@Immutable
@Table(name = "signboard_board")
public class SignboardBoard {

    @Id
    private Long id;

    /** 설치 위치명. */
    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String address;

    /** 전광판 식별자 (알림 targetHosts·전송 주소). null = 전광판 장비가 없는 현장. */
    @Column(length = 100)
    private String host;

    @Column(precision = 10, scale = 7)
    private BigDecimal lat;

    @Column(precision = 10, scale = 7)
    private BigDecimal lng;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id")
    private Region region;

    protected SignboardBoard() {
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getAddress() {
        return address;
    }

    public String getHost() {
        return host;
    }

    public BigDecimal getLat() {
        return lat;
    }

    public BigDecimal getLng() {
        return lng;
    }

    public Region getRegion() {
        return region;
    }
}
