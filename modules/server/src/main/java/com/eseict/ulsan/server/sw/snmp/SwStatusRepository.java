package com.eseict.ulsan.server.sw.snmp;

import java.util.Optional;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SwStatusRepository extends JpaRepository<SwStatus, Long> {
    Optional<SwStatus> findTopByOrderByCollectedAtDesc();

    /** 서울 시각 구간별 가장 느린 응답 ms [구간 시작, max rtt]. unit = 'hour' | 'day'. */
    @Query(value = """
            select date_trunc(:unit, collected_at at time zone 'Asia/Seoul') as bucket, max(rtt_ms)
              from server.sw_status where collected_at >= :from and collected_at < :to
             group by 1""", nativeQuery = true)
    List<Object[]> rttBuckets(@Param("unit") String unit, @Param("from") OffsetDateTime from, @Param("to") OffsetDateTime to);
}
