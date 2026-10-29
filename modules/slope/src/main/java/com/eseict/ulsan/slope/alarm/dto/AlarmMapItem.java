package com.eseict.ulsan.slope.alarm.dto;

import java.math.BigDecimal;

/**
 * 지도 버블 하나.
 *
 * <p>발령이 없는 지구도 {@code count: 0} 으로 내려간다 — 버블 자체는 그려야 하기 때문이다.
 * 범례 구간(0 / 1~2 / 3~5 / 6~9 / 10+)은 화면이 {@code count} 로 나눈다.
 *
 * <p>{@code count} 는 실제 발령, {@code needed} 는 발령 필요 건수(기간 안에 시작한 단계 구간)다.
 */
public record AlarmMapItem(
        Long areaId,
        String name,
        BigDecimal lat,
        BigDecimal lng,
        int count,
        int needed
) {
}
