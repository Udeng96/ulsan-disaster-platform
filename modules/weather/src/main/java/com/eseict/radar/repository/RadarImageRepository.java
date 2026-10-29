package com.eseict.radar.repository;

import com.eseict.radar.domain.RadarImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RadarImageRepository extends JpaRepository<RadarImage, Long> {

    /** 위성과 같은 Hibernate 6.x LIMIT 바인딩 이슈 회피를 위한 네이티브 EXISTS. */
    @Query(value = "SELECT EXISTS(SELECT 1 FROM weather.radar_image WHERE source_url = :url)",
           nativeQuery = true)
    boolean existsBySourceUrl(@Param("url") String sourceUrl);

    /** 특정 radarType 의 최근 N 건 — 관측시각 내림차순. */
    @Query(value = """
            SELECT * FROM weather.radar_image
            WHERE radar_type = :radarType
            ORDER BY observed_at_utc DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<RadarImage> findRecentByType(
            @Param("radarType") String radarType,
            @Param("limit") int limit);
}
