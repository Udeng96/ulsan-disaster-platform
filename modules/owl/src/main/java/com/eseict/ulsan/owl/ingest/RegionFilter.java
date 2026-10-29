package com.eseict.ulsan.owl.ingest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 관내 판별 — 목록의 재난발생위치명({@code dolcNm})에 시도·시군구 이름이 모두 들어 있는지 본다.
 *
 * <p>조회 API 에 위치 조건이 없어 전국 상황전파가 내려오므로 직접 거른다.
 * "남구" 는 부산·대구·인천·광주에도 있어 시도명과 함께 봐야 한다. 원본 표기가 일정하지 않아
 * ({@code "가상시설0565 …"} / 뒤 공백 등) {@code startsWith} 대신 <b>포함</b> 으로 판정한다.
 *
 * <p>{@code dolcNm} 이 없는 건은 특정 재난이 아니라 시 전체 공지·전달 성격
 * (예: "전달 : 화재, 교통사고 … 상황관리 철저")이라 대상에서 뺀다.
 */
@Component
public class RegionFilter {

    private final String sido;
    private final String sigungu;

    public RegionFilter(@Value("${owl.ingest.region.sido}") String sido,
                        @Value("${owl.ingest.region.sigungu}") String sigungu) {
        this.sido = sido;
        this.sigungu = sigungu;
    }

    public boolean isTarget(String dolcNm) {
        return dolcNm != null && dolcNm.contains(sido) && dolcNm.contains(sigungu);
    }

    public String sido() {
        return sido;
    }

    public String sigungu() {
        return sigungu;
    }
}
