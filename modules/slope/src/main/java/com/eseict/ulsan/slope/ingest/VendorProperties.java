package com.eseict.ulsan.slope.ingest;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 업체(무한정보기술) 상시계측 DB 연계 설정 ({@code slope.vendor.*}).
 *
 * <p>{@code enabled=false} 면 DataSource·스케줄러 빈 자체가 생성되지 않는다. 업체 DB 는
 * 내부망(192.0.2.50)에서만 도달하므로 개발 환경에서는 false 로 둔다.
 */
@ConfigurationProperties(prefix = "slope.vendor")
public record VendorProperties(
        boolean enabled,
        /** 폴링 주기(ms). 업체 측정 주기가 1분이라 10초면 충분하다. */
        long intervalMs,
        String url,
        String username,
        String password,
        /** 커넥션 풀 상한. 업체 DB 를 동시에 때리는 쿼리 수를 구조적으로 제한한다. */
        int maxPoolSize
) {
}
