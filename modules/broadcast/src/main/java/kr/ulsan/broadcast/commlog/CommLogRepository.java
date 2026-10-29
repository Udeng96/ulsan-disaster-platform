package kr.ulsan.broadcast.commlog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;

public interface CommLogRepository extends JpaRepository<CommLog, Long> {

    /** 기준 시각 이전 로그 삭제. 지운 건수를 돌려준다. */
    @Modifying
    @Query("delete from CommLog c where c.createdAt < :before")
    int deleteOlderThan(LocalDateTime before);
}
