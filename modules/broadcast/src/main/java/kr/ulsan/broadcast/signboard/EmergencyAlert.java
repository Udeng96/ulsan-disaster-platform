package kr.ulsan.broadcast.signboard;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * 전광판 push 본문의 {@code list[]} 항목 (전광판 규격 필드명, 일부 대문자).
 * 화면 요청({@link SignboardAlertRequest})에 모듈이 나머지 값을 채워 만든다({@link SignboardService}).
 *
 * <p>선택 필드(null)는 본문에서 제외된다(전역 {@code spring.jackson.default-property-inclusion=non_null}).
 */
public record EmergencyAlert(
        String identifier,
        @JsonProperty("MSG_CN") String msgCn,
        Integer displayDuration,
        String subType,
        String priority,
        @JsonProperty("RCPTN_RGN_NM") String rcptnRgnNm,
        String agency,
        @JsonProperty("timestampKR") String timestampKr,
        String expires,
        List<String> targetHosts
) {
}
