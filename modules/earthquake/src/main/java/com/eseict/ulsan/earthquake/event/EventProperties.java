package com.eseict.ulsan.earthquake.event;

import java.time.Duration;
import java.time.LocalDateTime;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 지진 이벤트 수집 설정.
 *
 * <p>업체 DB(MariaDB {@code accdb})는 우리 DB 와 다른 서버·다른 제품이다. <b>읽기 전용</b>으로만 쓴다.
 *
 * @param polling      수집 스위치. false 면 업체 DB 관련 빈이 아예 생성되지 않는다.
 * @param interval     수집 주기.
 * @param initialSince 최초 수집 시작점. 우리 테이블이 비어 있을 때만 쓰인다 — 이후로는 적재된
 *                     데이터의 최대 {@code source_regdate} 가 기준이다.
 *                     비워두면 전건을 가져온다.
 * @param source       업체 DB 접속정보.
 */
@ConfigurationProperties(prefix = "earthquake.event")
public record EventProperties(
        boolean polling,
        Duration interval,
        LocalDateTime initialSince,
        Source source
) {

    /** 업체 DB 에 몇 년치가 쌓여 있을지 모르므로, 시작점을 지정하지 않으면 전건을 읽는다. */
    private static final LocalDateTime EPOCH = LocalDateTime.of(1970, 1, 1, 0, 0);

    public LocalDateTime initialSinceOrEpoch() {
        return initialSince != null ? initialSince : EPOCH;
    }

    public record Source(
            String url,
            String username,
            String password,
            String driverClassName
    ) {
    }
}
