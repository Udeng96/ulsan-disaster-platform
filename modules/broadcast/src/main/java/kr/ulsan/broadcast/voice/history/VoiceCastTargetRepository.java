package kr.ulsan.broadcast.voice.history;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VoiceCastTargetRepository extends JpaRepository<VoiceCastTargetRecord, Long> {

    List<VoiceCastTargetRecord> findByVoiceCastId(Long voiceCastId);
}
