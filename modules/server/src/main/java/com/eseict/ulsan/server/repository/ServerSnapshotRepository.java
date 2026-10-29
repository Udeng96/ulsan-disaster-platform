package com.eseict.ulsan.server.repository;

import com.eseict.ulsan.server.entity.ServerSnapshot;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ServerSnapshotRepository extends JpaRepository<ServerSnapshot, Long> {

    Optional<ServerSnapshot> findFirstByServerIdOrderByCollectedAtDesc(Long serverId);

    List<ServerSnapshot> findByServerIdOrderByCollectedAtDesc(Long serverId, Pageable pageable);

    /** 같은 측정(같은 읽은 시각)은 두 번 저장하지 않는다 — 방화벽 SNMP 가 멈추면 같은 값이 반복해서 들어오기 때문. */
    boolean existsByServerIdAndCollectedAt(Long serverId, Instant collectedAt);

    /** 서버마다 최신 1행 — 메인 카드 13장을 쿼리 한 번으로 (자원 칸도 같이). */
    @Query("""
            select distinct s from ServerSnapshot s left join fetch s.resources
            where s.collectedAt = (select max(x.collectedAt) from ServerSnapshot x where x.server = s.server)
            """)
    List<ServerSnapshot> findLatestPerServer();

    /** 보존 기간 지난 이력 한 번에 삭제. 자원 칸(snapshot_resources)은 DB 가 같이 지운다(ON DELETE CASCADE). */
    @Modifying
    @Query("delete from ServerSnapshot s where s.collectedAt < :before")
    int deleteOlderThan(@Param("before") Instant before);

    @Query("select max(s.collectedAt) from ServerSnapshot s")
    Optional<Instant> findLastCollectedAt();

    @Query("select count(s) from ServerSnapshot s where s.server.id = :serverId and s.collectedAt >= :since")
    long countSince(@Param("serverId") Long serverId, @Param("since") Instant since);
}
