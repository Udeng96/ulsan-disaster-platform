package com.eseict.ulsan.owl.collect;

import com.eseict.ulsan.owl.collect.dto.CollectedMessage;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 부엉이 연계모듈(행정망) — 내부망(owl-web)이 요청하면 마지막으로 조회해 둔 메시지 목록을 응답한다.
 *
 * <ul>
 *   <li>{@code GET /owl/collect} — 최근(어제~오늘) 관내 부엉이 메시지 목록 (저장 전체 필드)</li>
 * </ul>
 * (공통 prefix {@code /owl} 은 server.servlet.context-path. 부엉이 조회는 여기서 하지 않는다 —
 * {@link OwlRefreshScheduler} 가 5분마다 한다)
 */
@RestController
@RequestMapping("/collect")
@RequiredArgsConstructor
public class CollectController {

    private final CollectService service;

    @GetMapping
    public List<CollectedMessage> collect() {
        return service.latest();
    }
}
