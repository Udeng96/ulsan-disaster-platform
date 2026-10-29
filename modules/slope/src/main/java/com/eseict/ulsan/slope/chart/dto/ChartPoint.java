package com.eseict.ulsan.slope.chart.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 차트 한 점.
 *
 * @param at       구간 시작 시각 (KST). 실시간이면 측정 시각 그대로
 * @param value    화면에 그릴 값. 종류별로 뽑는 방식이 다르다 — 아래 설명 참고
 * @param complete 이 구간이 신뢰할 만큼 채워졌는지. false 면 결측 표시를 하는 게 좋다.
 *                 실시간은 항상 true
 *
 * <p><b>{@code value} 를 뽑는 방식</b>
 * <ul>
 *   <li><b>강우량</b> — 업체 {@code msr_val}(누적합). 월 누적이 149mm 인데 {@code max_val} 은
 *       2.0 이었다. 누적 집계라 합계가 의미 있는 값이다</li>
 *   <li><b>경사계</b> — {@code GREATEST(abs(min), abs(max))}. 임계값이 절댓값 기준인데,
 *       {@code 0,0,0} 이상치가 시간당 6~8건 섞여 {@code max_val} 이 0 으로 오염된다.
 *       값이 음수 영역이면 max 가, 양수 영역이면 min 이 오염되므로 양쪽 절댓값 중 큰 것을 쓴다</li>
 *   <li><b>토양함수비·낙석</b> — {@code max_val}. 원시값이 임계값과 같은 스케일이고 음수가 없다</li>
 * </ul>
 */
public record ChartPoint(
        LocalDateTime at,
        BigDecimal value,
        boolean complete
) {
}
