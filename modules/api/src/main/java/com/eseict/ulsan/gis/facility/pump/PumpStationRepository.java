package com.eseict.ulsan.gis.facility.pump;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PumpStationRepository extends JpaRepository<PumpStation, Long> {

    /**
     * 모든 펌프장 + 배수구역 + 행정동 + 장비 한 번에 fetch.
     *
     * <p>지도 마커 / 리스트 / 상세 페이지 모두 같은 한 endpoint 에서 쓰므로 한 쿼리로 가져온다.
     * 장비의 {@code is_displayed} 필터는 DTO 매핑 시 적용.
     *
     * <p>{@code DISTINCT} — 한 펌프장에 여러 장비가 있으면 JOIN 결과가 펌프장 행이 중복되는데,
     * Hibernate 가 같은 엔티티는 합쳐주지만 명시적으로 DISTINCT 키워드 사용.
     */
    @Query("""
            SELECT DISTINCT ps FROM PumpStation ps
            JOIN FETCH ps.drainageZone
            JOIN FETCH ps.region
            LEFT JOIN FETCH ps.equipments
            ORDER BY ps.id ASC
            """)
    List<PumpStation> findAllWithEquipments();
}
