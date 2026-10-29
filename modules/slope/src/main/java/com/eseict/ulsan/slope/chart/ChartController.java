package com.eseict.ulsan.slope.chart;

import com.eseict.ulsan.slope.chart.dto.ChartResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 관측항목 차트. {@code /slope} 는 context-path.
 *
 * <p>{@code GET /slope/api/observations/{id}/chart?range=realtime|hour|day|month}
 *
 * <p>{@code id} 는 <b>관측항목</b>({@code observation_item.id}) 이지 계측기가 아니다.
 * 경사계 1대가 경사계·토양함수비 두 관측항목을 내고 각각 단위와 임계값이 달라
 * ({@code °} vs {@code %}, 0.3~1.7 vs 20~45) 한 차트에 못 그린다. 화면도 버튼으로 나눠 본다.
 *
 * <p>계측기 목록은 {@code /api/areas} 가 준다. 거기 {@code values[].unitType} 으로 어느
 * 관측항목인지 알 수 있다.
 */
@RestController
@RequestMapping("/api/observations/{id}/chart")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "slope.vendor.enabled", havingValue = "true")
public class ChartController {

    private final ChartService service;

    @GetMapping
    public ChartResponse chart(@PathVariable Long id,
                               @RequestParam(defaultValue = "realtime") ChartRange range) {
        return service.chart(id, range);
    }
}
