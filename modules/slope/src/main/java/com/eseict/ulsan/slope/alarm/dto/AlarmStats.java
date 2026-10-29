package com.eseict.ulsan.slope.alarm.dto;

import java.util.List;
import java.util.Map;

/**
 * 조기경보·통계 화면의 우측 패널.
 *
 * <p><b>해제는 발령이 아니다.</b> {@code byLevel} 의 합은 {@code issued} 와 같고 해제는
 * 섞이지 않는다. 화면에 "정상(해제)" 줄을 그리려면 {@code released} 를 쓴다.
 *
 * @param issued   발령 건수. 반복 발송을 1건으로 묶은 뒤 센 값
 * @param released 해제 건수
 * @param byLevel  단계별 발령 건수 (관심/주의/경계/심각)
 * @param monthly  월별 추이 12개월. 기간 필터와 무관하게 항상 올해 1~12월
 * @param needed        발령 필요 건수 — 기간 안에 시작한 단계 구간 ({@link AlarmEventResponse})
 * @param neededByLevel 단계별 발령 필요 건수
 */
public record AlarmStats(
        int issued,
        int released,
        Map<String, Integer> byLevel,
        List<MonthlyCount> monthly,
        int needed,
        Map<String, Integer> neededByLevel
) {
}
