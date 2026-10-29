package com.eseict.ulsan.gis.common.search;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 행안부 도로명주소 API 설정 — {@code application.yml} 의 {@code juso.*} 매핑.
 *
 * <p>도로명 / 지번 / 건물명 통합 키워드 검색용. 좌표는 주지 않아 vWorld 지오코더로 별도 조회한다.
 *
 * @param confmKey     도로명주소 검색 API 승인키 (business.juso.go.kr 발급)
 * @param baseUrl      검색 API URL (예: {@code https://business.juso.go.kr/addrlink/addrLinkApi.do})
 * @param countPerPage 페이지당 결과 개수 — 결과마다 vWorld 지오코딩이 붙으므로 이 값이 곧 좌표 호출 수
 */
@ConfigurationProperties(prefix = "juso")
public record JusoProperties(
        String confmKey,
        String baseUrl,
        int countPerPage
) {}
