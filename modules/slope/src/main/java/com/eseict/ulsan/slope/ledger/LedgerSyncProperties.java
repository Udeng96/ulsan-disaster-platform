package com.eseict.ulsan.slope.ledger;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 급경사지 관리대장 동기화 설정 ({@code slope.ledger.*}).
 *
 * <p>{@code polling=false} 면 스케줄러 빈 자체가 생성되지 않아 아무것도 돌지 않는다.
 */
@ConfigurationProperties(prefix = "slope.ledger")
public record LedgerSyncProperties(
        boolean polling,
        String cron,
        String zone,
        String baseUrl,
        String serviceKey,
        int pageSize,
        /** 법정동코드 앞 5자리. 울산 남구 = 31140. */
        String regionCode,
        /** 페이지 사이 대기(ms). 연속 호출 시 서버가 연결을 끊어 간격이 필요하다. */
        long requestDelayMs,
        int maxRetries
) {
}
