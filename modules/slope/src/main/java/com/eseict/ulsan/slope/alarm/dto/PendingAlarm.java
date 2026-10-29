package com.eseict.ulsan.slope.alarm.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 발령 필요 — 급경사지의 현재 상태로 판단한다. 지구당 최대 1건.
 *
 * <p>기간 필터가 없다. "지금 발령이 필요한 상태" 를 보는 것이라 실시간이다.
 *
 * @param fromLevel  <b>정상에서 벗어난 시점의 직전 단계.</b> 대개 "정상" 이다.
 *                   단계별 변화(정상→관심→주의)는 이력에 그대로 쌓이지만 여기서는
 *                   "정상 → 주의" 로 묶어 보여준다
 * @param occurredAt <b>정상에서 벗어난 시각.</b> 마지막 단계 변화 시각이 아니다 —
 *                   14시에 관심, 15시에 주의가 됐다면 14시다. 얼마나 오래 방치됐는지가
 *                   드러나야 하기 때문이다
 * @param cause      그 단계를 최근 180분 안에 넘은 계측기의 업체 이름 (쉼표 구분, 예
 *                   {@code 삼익_수집2_경사_함수-3}). 업체 문자·시스템과 같은 이름이라 찾아볼 수 있다
 * @param causeValue 원인 계측기의 그 시점 값. 경사계는 X·Y 중 절댓값이 큰 축
 */
public record PendingAlarm(
        String areaName,
        String level,
        String fromLevel,
        LocalDateTime occurredAt,
        String cause,
        String causeUnitType,
        BigDecimal causeValue,
        String causeUnit
) {
}
