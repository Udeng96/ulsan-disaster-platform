package com.eseict.forecast.repository;

import com.eseict.forecast.domain.Prediction;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;

public interface PredictionRepository extends JpaRepository<Prediction, Long> {

    boolean existsByLocationIdAndBaseAtAndForecastAt(
            Long locationId, OffsetDateTime baseAt, OffsetDateTime forecastAt);

    /** 특정 location 의 from 시각 이후 가장 최근 base 의 예보 — forecastAt 오름차순.
     *  (예보는 같은 forecastAt 에 여러 baseAt 이 누적될 수 있어 가장 최근 base 우선.) */
    @Query("""
        SELECT p FROM Prediction p
         WHERE p.locationId = :locationId
           AND p.forecastAt >= :from
           AND p.baseAt = (
                 SELECT MAX(p2.baseAt) FROM Prediction p2
                  WHERE p2.locationId = p.locationId
                    AND p2.forecastAt = p.forecastAt
           )
         ORDER BY p.forecastAt ASC
        """)
    List<Prediction> findUpcomingFromLatestBase(
            @Param("locationId") Long locationId,
            @Param("from") OffsetDateTime from,
            Pageable pageable);
}
