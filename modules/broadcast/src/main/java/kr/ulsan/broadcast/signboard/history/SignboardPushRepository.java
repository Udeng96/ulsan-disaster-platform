package kr.ulsan.broadcast.signboard.history;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SignboardPushRepository extends JpaRepository<SignboardPushRecord, Long> {

    /** 그 전광판에 마지막으로 보낸 전송 중 해당 결과인 것 (표출중 판단은 SUCCESS). */
    Optional<SignboardPushRecord> findFirstByBoardHostAndStatusOrderByIdDesc(String boardHost, String status);

    List<SignboardPushRecord> findBySignboardAlertIdOrderByBoardHost(Long signboardAlertId);
}
