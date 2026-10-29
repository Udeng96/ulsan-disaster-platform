package kr.ulsan.broadcast.region;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

/** 행정동 ({@code common.region}). gis 가 관리하고 이 모듈은 이름만 읽는다. */
@Entity
@Immutable
@Table(name = "region", schema = "common")
public class Region {

    @Id
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    protected Region() {
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }
}
