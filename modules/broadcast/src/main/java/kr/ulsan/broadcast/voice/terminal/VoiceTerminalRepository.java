package kr.ulsan.broadcast.voice.terminal;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface VoiceTerminalRepository extends JpaRepository<VoiceTerminal, Long> {

    /** 전체 단말 + 행정동 (id 순). */
    @Query("SELECT t FROM VoiceTerminal t LEFT JOIN FETCH t.region ORDER BY t.id")
    List<VoiceTerminal> findAllWithRegion();
}
