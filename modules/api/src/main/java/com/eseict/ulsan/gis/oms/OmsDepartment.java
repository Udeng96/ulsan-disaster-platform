package com.eseict.ulsan.gis.oms;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * OMS 부서.
 *
 * <p>OMS 관리자 시스템 테이블 ({@code oms.oms_dpt_info}) — <b>읽기 전용</b>.
 * 조회는 울산({@code client_cd='ULSAN'}) + 관리자 부서({@code dpt_cd='MANAGER'}) 제외로 필터.
 */
@Entity
@Table(name = "oms_dpt_info", schema = "oms")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OmsDepartment {

    @Id
    @Column(name = "dpt_id")
    private String id;

    @Column(name = "dpt_cd")
    private String code;

    @Column(name = "dpt_nm")
    private String name;

    @Column(name = "client_cd")
    private String clientCode;
}
