package com.eseict.airquality.repository;

import com.eseict.airquality.domain.AirQuality;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;

public interface AirQualityRepository extends JpaRepository<AirQuality, Long> {

    boolean existsByStationNameAndMeasuredAt(String stationName, OffsetDateTime measuredAt);

    /** 특정 측정소의 가장 최근 측정값 1건. */
    AirQuality findTopByStationNameOrderByMeasuredAtDesc(String stationName);
}
