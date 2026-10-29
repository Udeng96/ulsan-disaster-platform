package com.eseict.ulsan.server.firewall.syslog;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FwLogRepository extends JpaRepository<FwLog, Long> {

    List<FwLog> findByTagInOrderByReceivedAtDesc(Collection<String> tags, Pageable pageable);

    Optional<FwLog> findTopByTagOrderByReceivedAtDesc(String tag);

    long countByTagInAndReceivedAtAfter(Collection<String> tags, OffsetDateTime after);

    /** 태그별 건수 [tag, count]. 유형별 내역 팝업용. */
    @Query("select l.tag, count(l) from FwLog l where l.tag in :tags and l.receivedAt >= :from group by l.tag")
    List<Object[]> countByTagSince(@Param("tags") Collection<String> tags, @Param("from") OffsetDateTime from);

    /**
     * 서울 시각 기준 구간별 건수 [구간 시작(서울 시각, timestamp), count]. unit = 'hour' | 'day'.
     * from ≤ 수신 시각 < to 만 센다. 건수가 0 인 구간은 나오지 않으므로 호출하는 쪽에서 0 으로 채운다.
     */
    @Query(value = """
            select date_trunc(:unit, received_at at time zone 'Asia/Seoul') as bucket, count(*)
              from server.fw_log
             where tag in (:tags) and received_at >= :from and received_at < :to
             group by 1""", nativeQuery = true)
    List<Object[]> countBuckets(@Param("unit") String unit, @Param("tags") Collection<String> tags,
                                @Param("from") OffsetDateTime from, @Param("to") OffsetDateTime to);

    /** 지난 기간 경고 로그 중 본문에 전원 관련 낱말이 있는 건수. */
    @Query("""
            select count(l) from FwLog l
             where l.tag in :tags and l.receivedAt >= :from
               and (lower(l.body) like '%power%' or lower(l.body) like '%psu%' or l.body like '%전원%')""")
    long countPowerAlertsSince(@Param("tags") Collection<String> tags, @Param("from") OffsetDateTime from);
}
