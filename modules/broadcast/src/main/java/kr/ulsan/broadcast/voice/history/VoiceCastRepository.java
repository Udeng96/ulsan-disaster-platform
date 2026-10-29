package kr.ulsan.broadcast.voice.history;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VoiceCastRepository extends JpaRepository<VoiceCastRecord, Long> {

    /** 업체 CAST ID 로 방송 이력 찾기 (가장 최근 것). */
    Optional<VoiceCastRecord> findFirstByCastIdOrderByIdDesc(String castId);
}
