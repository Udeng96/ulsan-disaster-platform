package com.eseict.ulsan.earthquake.instrument;

import com.eseict.ulsan.earthquake.instrument.dto.InstrumentResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 지진 계측기 조회. {@code /earthquake} 는 context-path.
 *
 * <p>{@code GET /earthquake/api/instruments} — 계측기 4대 전건
 */
@RestController
@RequestMapping("/api/instruments")
@RequiredArgsConstructor
public class InstrumentController {

    private final InstrumentService service;

    @GetMapping
    public List<InstrumentResponse> list() {
        return service.list();
    }
}
