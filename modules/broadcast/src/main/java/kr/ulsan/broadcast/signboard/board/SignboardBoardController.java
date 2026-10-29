package kr.ulsan.broadcast.signboard.board;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 재해문자전광판 목록 조회 ({@code GET /api/broadcast/signboards}). */
@RestController
@RequestMapping("/api/broadcast/signboards")
public class SignboardBoardController {

    private final SignboardBoardRepository boards;

    public SignboardBoardController(SignboardBoardRepository boards) {
        this.boards = boards;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<SignboardBoardResponse> list() {
        return boards.findAllWithRegion().stream().map(SignboardBoardResponse::from).toList();
    }
}
