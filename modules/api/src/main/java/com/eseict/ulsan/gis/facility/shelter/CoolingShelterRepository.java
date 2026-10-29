package com.eseict.ulsan.gis.facility.shelter;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CoolingShelterRepository extends JpaRepository<CoolingShelter, Long> {

    /**
     * 모든 무더위쉼터 + 소속 행정동 한 번에 fetch.
     */
    @Query("""
            SELECT s FROM CoolingShelter s
            LEFT JOIN FETCH s.region
            ORDER BY s.id ASC
            """)
    List<CoolingShelter> findAllWithRegion();
}
