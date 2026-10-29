package com.eseict.ulsan.slope.facility;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AreaLevelEventRepository extends JpaRepository<AreaLevelEvent, Long> {

    /** 진행 중인 구간. 지구당 하나다. */
    List<AreaLevelEvent> findByEndedAtIsNull();

    /** 발령 이력 전체, 최근 것부터. */
    List<AreaLevelEvent> findAllByOrderByStartedAtDescIdDesc();

    /** 기간 안에 시작한 구간. 통계에 쓴다. */
    List<AreaLevelEvent> findByStartedAtGreaterThanEqualAndStartedAtLessThan(LocalDateTime from, LocalDateTime to);

    /**
     * 그 발령이 가리키는 구간 — 발령 시각 전에 시작한 같은 단계 구간 중 가장 최근 것.
     */
    Optional<AreaLevelEvent> findTopByAreaIdAndLevelAndStartedAtLessThanEqualOrderByStartedAtDesc(
            Long areaId, String level, LocalDateTime at);
}
