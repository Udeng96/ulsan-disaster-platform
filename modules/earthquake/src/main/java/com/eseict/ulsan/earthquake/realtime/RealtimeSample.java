package com.eseict.ulsan.earthquake.realtime;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 업체 실시간 API 응답 한 건. 필드는 업체가 준 형태 그대로다.
 *
 * <p>업체는 <b>SSE</b> 로 보낸다 — 이 record 는 {@code data:} 접두사를 걷어낸 JSON 배열의
 * 원소 하나에 대응한다.
 *
 * <pre>data: [{"net":"US","obs":"NGT","time":"2026-08-24 09:41:14","hpga":0.042357188,"tpga":0.042397812}]</pre>
 *
 * <p>{@code hpga} 는 수평성분 합성 최대가속도(gal), {@code tpga} 는 3성분. 축별이 아니라
 * 관측소별로 하나씩 온다.
 *
 * <p>{@code net}+{@code obs} 가 {@code earthquake.instrument} 와의 매핑 키.
 */
public record RealtimeSample(
        String net,
        String obs,
        @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime time,
        BigDecimal hpga,
        BigDecimal tpga
) {
}
