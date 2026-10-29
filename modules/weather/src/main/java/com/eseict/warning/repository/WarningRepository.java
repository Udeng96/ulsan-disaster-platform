package com.eseict.warning.repository;

import com.eseict.warning.domain.Warning;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;

public interface WarningRepository extends JpaRepository<Warning, Long> {

    boolean existsByStnIdAndTmFcAndTitle(String stnId, OffsetDateTime tmFc, String title);

    /**
     * 특정 stnId 의 from 시각 이후 발표된 특보 — tmFc 내림차순.
     * (대시보드는 "오늘 발표분만" 표시하려고 사용. from = 오늘 KST 00:00.)
     * Hibernate 6.x LIMIT 바인딩 이슈 회피용 native query.
     */
    @Query(value = """
            SELECT * FROM weather.warning
            WHERE stn_id = :stnId
              AND tm_fc >= :from
            ORDER BY tm_fc DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Warning> findActiveByStnIdSince(
            @Param("stnId") String stnId,
            @Param("from") OffsetDateTime from,
            @Param("limit") int limit);
}
