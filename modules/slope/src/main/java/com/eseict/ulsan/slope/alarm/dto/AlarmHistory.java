package com.eseict.ulsan.slope.alarm.dto;

import java.time.LocalDateTime;

/**
 * 발령 이력 한 건. 업체 {@code snr_isnc_log} 에서 온다.
 *
 * <p><b>스피커·전광판 로그가 아니다.</b> 그 둘은 문구를 표출했다는 송출 기록일 뿐이고 실제
 * 발령은 여기에 남는다 (2026-09-07 업체 답변, deploy/업체-답변.md 2-(2)).
 * 발령 1건이 송출 여러 건을 만들어 수치가 크게 달랐다 — 2년간 발령 2건, 송출 11건.
 *
 * <p><b>해제는 제외된다.</b> "발령 이력" 에 해제가 섞이면 혼란스럽다 —
 * 해제 건수는 통계의 {@code released} 로 본다.
 *
 * @param issuer    발령자 이름 ({@code usr_nm}). 지금까지는 전부 업체 계정 "관리자" 다
 * @param fromLevel 발령 직전 단계
 * @param level     발령된 단계
 * @param message   업체 본문. 원인 관측항목이 나열돼 있다
 */
public record AlarmHistory(
        String areaName,
        String issuer,
        String fromLevel,
        String level,
        LocalDateTime issuedAt,
        String message
) {
}
