package com.eseict.ulsan.slope.facility.dto;

import com.eseict.ulsan.slope.facility.ManagedArea;
import java.math.BigDecimal;

/**
 * 관리지역 응답.
 *
 * <p>화면이 쓰는 것만 담는다 — 목록 5개(관리번호·급경사지명·등급·관리기관·관리부서)와
 * 지도 마커 좌표, 정보 팝업에서 사용할 원본 법정동·지번을 제공한다.
 *
 * @param grade A / B / C. <b>현재 전건 'A' 로 자리만 채워둔 임시값이다</b> — 실제 등급은
 *              안전점검 결과표를 받아 업로드하는 기능을 만든 뒤 채운다.
 */
public record ManagedAreaResponse(
        Long id,
        String mgmtNo,
        String name,
        String grade,
        String org,
        String department,
        BigDecimal lat,
        BigDecimal lng,
        String legalDong,
        String legalDongCode,
        String jibun
) {
    public static ManagedAreaResponse from(ManagedArea s) {
        return new ManagedAreaResponse(
                s.getId(),
                s.getMgmtNo(),
                s.getName(),
                s.getGrade(),
                s.getOrg() == null ? null : s.getOrg().replace("울산남구청", "").trim(),
                s.getDepartment(),
                s.getLat(),
                s.getLng(),
                s.getLegalDong(),
                s.getLegalDongCode(),
                s.getJibun()
        );
    }
}
