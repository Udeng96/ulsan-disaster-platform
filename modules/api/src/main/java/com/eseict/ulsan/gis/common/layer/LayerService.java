package com.eseict.ulsan.gis.common.layer;

import java.util.List;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 지도 레이어 메타 조회 / 색 변경.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class LayerService {

    /** 허용 색 형식 — #RRGGBB (color 컬럼 length 7). */
    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9a-fA-F]{6}$");

    private final LayerRepository repository;

    /** 사용중인 레이어만 표출 순서대로. */
    public List<LayerResponse> listActive() {
        return repository.findByActiveTrueOrderByDisplayOrderAsc().stream()
                .map(LayerResponse::from)
                .toList();
    }

    /**
     * 레이어 색 일괄 변경. 존재하지 않는 code / 형식이 잘못된 색은 조용히 건너뛴다
     * (batch 중 한 항목이 전체를 실패시키지 않도록).
     */
    @Transactional
    public void updateColors(List<LayerColorUpdate> updates) {
        if (updates == null) {
            return;
        }
        for (LayerColorUpdate u : updates) {
            if (u == null || u.code() == null || u.color() == null) {
                continue;
            }
            if (!HEX_COLOR.matcher(u.color()).matches()) {
                continue;
            }
            repository.findByCode(u.code()).ifPresent(layer -> layer.changeColor(u.color()));
        }
    }
}
