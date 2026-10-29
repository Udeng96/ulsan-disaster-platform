package com.eseict.ulsan.server.host.part;

import com.eseict.ulsan.server.domain.Verdict;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;

/**
 * 서버 상세 전면·후면 표 (2026-10-16, 수기항목 엑셀 기준). 줄 = 사람이 넣은 host_part + 서버에서 읽은 디스크·랜카드.
 * measuredAt 이 null 이면 서버에서 읽은 값이 없음(SSH 계정 전 · 10분 넘게 못 읽음) → 디스크·랜카드 줄이 없고 사람 값만.
 */
public record HostParts(
        String host,
        @Schema(description = "디스크·랜카드를 읽은 시각. null = 실측 대기") Instant measuredAt,
        @Schema(description = "전면 — 항목 · 장착 내용 · 상태 · 사용/용량") List<Row> front,
        @Schema(description = "후면 — 포트 · 연결 상대 · 상태 · 트래픽") List<Row> rear) {

    public record Row(
            @Schema(description = "항목·포트. 예: PSU1 · LED1 · sda · eno3") String item,
            @Schema(description = "장착 내용·연결 상대. 예: UPS 전원 · SSD 480.1GB · bond0 묶음") String content,
            @Schema(description = "상태. 예: 장착 · 연결됨 · 연결 안 됨 · 사용 안 함. 모르면 null") String state,
            @Schema(description = "상태 색. 읽은 값만 판정, 사람이 적은 상태는 null(회색)") Verdict verdict,
            @Schema(description = "전면 = 사용/용량 「7.6GB / 446.6GB」, 후면 = 트래픽 「받음 30.2GB · 보냄 36.1GB」(켜진 뒤 누적)") String usage,
            @Schema(description = "값 출처: 사람(수기항목 엑셀 10-16 …) 또는 「서버에서 읽음」") String source) {}
}
