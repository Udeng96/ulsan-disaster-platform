package com.eseict.ulsan.owl.ingest.dto;

/**
 * 부엉이 원본 메시지 (MsgInfo 수신 필드, 가공 전 문자열 그대로).
 *
 * <p>필드명/포맷은 상황전파 표준 API 문서(Response 샘플) 기준.
 * {@code OwlDetailClient} 가 {@code MsgInfo} getter 로 채운다.
 * timestamp/좌표/주소 fallback/enum 변환은 {@code OwlMessageMapper} 에서 수행.
 */
public record OwlRawMessage(
        String msgId,
        String msgSn,
        String sndDe,               // 발신 일자 yyyyMMdd
        String sndHms,              // 발신 시분초 HHmmss
        String msgSprtr,            // 메시지 구분 코드 1~5 (1:상황보고 2:대응지시 3:관측정보 4:긴급구조 5:기타)
        String dstrTyCd,            // 재난유형 코드
        String dstrTyNm,            // 재난유형 명
        String sj,                  // 제목
        String dstrOccrDe,          // 재난발생 일자 yyyyMMdd
        String dstrOccrHms,         // 재난발생 시분초 HHmmss
        String dstrEndNm,           // 종료여부 명
        String dolcHdongCd,         // 행정동 코드 (실데이터는 대부분 빈 값)
        String dolcBdongCd,         // 법정동 코드 (행정동이 없을 때 대체)
        String dolcNm,              // 위치명
        String dolcFllHdongAdres,   // 행정동 전체주소
        String dolcFllBdongAdres,   // 법정동 전체주소
        String dolcFllRnAdres,      // 도로명 전체주소
        String dolcXcord,           // X좌표(경도)
        String dolcYcord,           // Y좌표(위도)
        String sittnSumry           // 상황개요 (URL 인코딩된 HTML)
) {
}
