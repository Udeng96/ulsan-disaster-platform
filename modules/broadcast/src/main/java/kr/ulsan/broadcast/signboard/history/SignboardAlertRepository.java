package kr.ulsan.broadcast.signboard.history;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SignboardAlertRepository extends JpaRepository<SignboardAlertRecord, Long> {
}
