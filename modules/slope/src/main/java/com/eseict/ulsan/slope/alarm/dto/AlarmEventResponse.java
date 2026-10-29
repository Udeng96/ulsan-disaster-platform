package com.eseict.ulsan.slope.alarm.dto;

import java.time.LocalDateTime;

/**
 * 발령 이력 한 건 — <b>실제 발령이 아니라 지구 단계 구간</b>이다 (2026-10-01 클라이언트 요청,
 * 2026-10-14 기준을 상단 탭 단계로 바꿈).
 *
 * <p>남구청은 담당자 발령을 하지 않아, 지구가 한 단계에 머문 구간을 이력으로 보여준다. 같은 단계가
 * 이어지는 동안 업체 문자가 24시간마다 다시 와도 한 건이다 ({@code sendCount}).
 *
 * <p>앞의 여섯 필드는 예전 발령 이력과 이름이 같다 — 화면이 그대로 그릴 수 있다.
 *
 * @param issuer     발령자. 이 구간에 실제 발령이 있었을 때만, 아니면 null
 * @param fromLevel  직전 단계. 정상에서 올라왔으면 정상
 * @param level      이 구간의 단계
 * @param issuedAt   이 단계가 된 시각. 격상은 업체 문자 시각, 격하는 패널이 내려간 시각
 * @param message    늘 null. 원인은 {@code causes}
 * @param direction  격상 UP / 격하 DOWN
 * @param lastSentAt 구간 동안 받은 마지막 업체 문자 시각. 없으면 null
 * @param sendCount  구간 동안 받은 업체 문자 수
 * @param endedAt    다른 단계나 정상으로 바뀐 시각. 진행 중이면 null
 * @param causes     업체 계측기 이름, 쉼표 구분
 */
public record AlarmEventResponse(
        String areaName,
        String issuer,
        String fromLevel,
        String level,
        LocalDateTime issuedAt,
        String message,
        String direction,
        LocalDateTime lastSentAt,
        int sendCount,
        LocalDateTime endedAt,
        String causes
) {
}
