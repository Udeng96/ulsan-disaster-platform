package com.eseict.forecast.repository;

import com.eseict.forecast.domain.Observation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;

public interface ObservationRepository extends JpaRepository<Observation, Long> {

    boolean existsByLocationIdAndObservedAt(Long locationId, OffsetDateTime observedAt);

    /** 특정 location 의 가장 최근 실황 1건. */
    Observation findTopByLocationIdOrderByObservedAtDesc(Long locationId);
}
