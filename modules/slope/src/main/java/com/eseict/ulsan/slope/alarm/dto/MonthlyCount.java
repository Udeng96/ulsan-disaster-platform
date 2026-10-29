package com.eseict.ulsan.slope.alarm.dto;

/**
 * 월별 건수. {@code month} 는 {@code 2026-09} 형식.
 *
 * @param count  실제 발령 건수
 * @param needed 발령 필요 건수 (그 달에 시작한 단계 구간)
 */
public record MonthlyCount(String month, int count, int needed) {
}
