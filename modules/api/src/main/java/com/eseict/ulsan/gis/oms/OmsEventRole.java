package com.eseict.ulsan.gis.oms;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * OMS 이벤트 롤 (권한).
 *
 * <p>OMS 관리자 시스템 테이블 ({@code oms.oms_event_role_info}) — <b>읽기 전용</b>.
 * 우리 Flyway 관리 밖이라 마이그레이션 없이 조회만 매핑한다.
 * 예: "음성 방송"(자동음성통보 권한), "전광판"(전광판 권한).
 */
@Entity
@Table(name = "oms_event_role_info", schema = "oms")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OmsEventRole {

    @Id
    @Column(name = "evet_role_id")
    private String id;

    @Column(name = "evet_role_nm")
    private String name;

    @Column(name = "evet_role_desc")
    private String description;
}
