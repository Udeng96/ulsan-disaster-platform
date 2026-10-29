package kr.ulsan.broadcast.signboard.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SignboardBoardRepository extends JpaRepository<SignboardBoard, Long> {

    /** 전체 전광판 + 행정동 (id 순). */
    @Query("SELECT b FROM SignboardBoard b LEFT JOIN FETCH b.region ORDER BY b.id")
    List<SignboardBoard> findAllWithRegion();

    /** host 가 있는 전광판의 host (id 순) — "전체 전광판" 알림의 전송 대상. */
    @Query("SELECT b.host FROM SignboardBoard b WHERE b.host IS NOT NULL ORDER BY b.id")
    List<String> findHosts();
}
