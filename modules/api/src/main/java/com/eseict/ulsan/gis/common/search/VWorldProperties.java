package com.eseict.ulsan.gis.common.search;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * V-World API 설정 — {@code application.yml} 의 {@code vworld.*} 매핑.
 *
 * <p>주소검색은 도로명주소 API(juso)가 담당하고, vWorld 는 그 결과의 좌표 조회(지오코더)에만 쓴다.
 * 키 만료 / 도메인 변경 시 yml 값만 갈아끼우면 된다.
 *
 * @param key        V-World 인증키
 * @param geocodeUrl 지오코더 URL (예: {@code https://api.vworld.kr/req/address})
 */
@ConfigurationProperties(prefix = "vworld")
public record VWorldProperties(
        String key,
        String geocodeUrl
) {}
