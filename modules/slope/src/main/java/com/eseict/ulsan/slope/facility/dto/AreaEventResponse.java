package com.eseict.ulsan.slope.facility.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 급경사지 이벤트 이력 한 건.
 *
 * <p>발령 여부와 무관하게 <b>단계가 바뀔 때마다</b> 한 건이다. 올라가도 내려가도 정상이 돼도 남는다.
 *
 * @param id            그 변화를 만든 단계 구간의 id. 정상 복귀 건은 닫힌 구간의 id 라 겹칠 수 있다
 * @param eventType     HIGH = 단계 상승, LOW = 단계 하강
 * @param cause         원인 계측기(업체 이름), 쉼표 구분. 정상 복귀 건은 null
 * @param causeUnitType 늘 null — 단계가 계측기 하나가 아니라 패널 판정에서 온다
 * @param causeValue    늘 null
 * @param causeUnit     늘 null
 * @param issuer        발령자. 이 구간에 실제 발령이 있었을 때만
 */
public record AreaEventResponse(
        Long id,
        Long areaId,
        String areaName,
        String fromLevel,
        String toLevel,
        String eventType,
        LocalDateTime occurredAt,
        String cause,
        String causeUnitType,
        BigDecimal causeValue,
        String causeUnit,
        boolean issued,
        String issuer
) {
}
