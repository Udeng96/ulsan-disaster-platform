package kr.ulsan.broadcast.voice.terminal;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 자동음성 단말 목록 조회 ({@code GET /api/broadcast/terminals}). */
@RestController
@RequestMapping("/api/broadcast/terminals")
public class VoiceTerminalController {

    private final VoiceTerminalRepository terminals;

    public VoiceTerminalController(VoiceTerminalRepository terminals) {
        this.terminals = terminals;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<VoiceTerminalResponse> list() {
        return terminals.findAllWithRegion().stream().map(VoiceTerminalResponse::from).toList();
    }
}
