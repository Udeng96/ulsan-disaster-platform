package com.eseict.ulsan.slope.facility.dto;

import java.util.List;

/**
 * 관리지역 등급 엑셀 업로드 결과.
 *
 * <p>{@code errors} 가 비어 있지 않으면 <b>아무것도 반영하지 않은 것</b>이다 — 한 줄이라도 틀리면
 * 전체를 거부한다. 이때 건수는 모두 0 이다.
 *
 * @param changed   등급이 바뀐 지역 수
 * @param unchanged 같은 등급이라 그대로인 지역 수
 * @param skipped   등급 칸이 비어 건너뛴 행 수
 * @param errors    틀린 행. 엑셀의 행 번호(1부터, 머리글 포함)와 이유
 */
public record GradeUploadResponse(
        int changed,
        int unchanged,
        int skipped,
        List<RowError> errors
) {
    public record RowError(int row, String mgmtNo, String reason) {
    }

    public static GradeUploadResponse rejected(List<RowError> errors) {
        return new GradeUploadResponse(0, 0, 0, errors);
    }
}
