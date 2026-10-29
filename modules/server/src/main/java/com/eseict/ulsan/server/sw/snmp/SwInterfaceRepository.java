package com.eseict.ulsan.server.sw.snmp;

import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SwInterfaceRepository extends JpaRepository<SwInterface, Long> {

    @Query("""
            select i from SwInterface i
            where i.collectedAt = (select max(x.collectedAt) from SwInterface x)
            """)
    List<SwInterface> findLatest();

    /** since 이후 에러 수(받기+보내기)가 늘어난 포트 이름. 누적값의 최대 − 최소 > 0. */
    @Query("""
            select i.ifName from SwInterface i
            where i.collectedAt >= :since
            group by i.ifName
            having max(coalesce(i.inErrors, 0) + coalesce(i.outErrors, 0))
                 > min(coalesce(i.inErrors, 0) + coalesce(i.outErrors, 0))
            order by i.ifName
            """)
    List<String> findErrorPortsSince(@Param("since") OffsetDateTime since);

    /**
     * 수집 1회마다 전체 받은 bps(포트 합)와 브로드캐스트 비율을 구한 뒤, 서울 시각 구간별로
     * [구간 시작, 평균 bps, 가장 높은 브로드캐스트 %] 를 낸다. unit = 'hour' | 'day'. bps 가 없는 회차(재기동 첫 샘플)는 뺀다.
     */
    @Query(value = """
            select date_trunc(:unit, collected_at at time zone 'Asia/Seoul') as bucket,
                   avg(total_bps), max(bcast_pct)
              from (select collected_at,
                           sum(in_bps) as total_bps,
                           case when sum(in_pps) > 0 then sum(bcast_pps) * 100.0 / sum(in_pps) end as bcast_pct
                      from server.sw_interface
                     where collected_at >= :from and collected_at < :to and in_bps is not null
                     group by collected_at) t
             group by 1""", nativeQuery = true)
    List<Object[]> trafficBuckets(@Param("unit") String unit, @Param("from") OffsetDateTime from, @Param("to") OffsetDateTime to);

    /** from 이후 수집 1회당 전체 받은 bps 의 평균 (평소선). 기록 없으면 null. */
    @Query(value = """
            select avg(total_bps) from (select sum(in_bps) as total_bps from server.sw_interface
                     where collected_at >= :from and in_bps is not null group by collected_at) t""", nativeQuery = true)
    Double averageTotalBps(@Param("from") OffsetDateTime from);

    /** since 이후 포트별 에러 증가 수 [if_name, 증가 수]. 늘어난 포트만. */
    @Query(value = """
            select if_name, max(coalesce(in_errors,0) + coalesce(out_errors,0)) - min(coalesce(in_errors,0) + coalesce(out_errors,0))
              from server.sw_interface where collected_at >= :since
             group by if_name
            having max(coalesce(in_errors,0) + coalesce(out_errors,0)) > min(coalesce(in_errors,0) + coalesce(out_errors,0))""",
            nativeQuery = true)
    List<Object[]> errorIncreaseSince(@Param("since") OffsetDateTime since);
}
