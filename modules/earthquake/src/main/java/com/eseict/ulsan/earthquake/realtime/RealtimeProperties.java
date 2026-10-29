package com.eseict.ulsan.earthquake.realtime;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 실시간 계측값 구독 설정.
 *
 * <p><b>폴링이 아니라 구독형이다.</b> 한 번 붙으면 업체가 계속 밀어준다 — 요청 주기가 없다.
 *
 * @param enabled        구독 스위치. false 면 구독 빈이 생성되지 않아 외부에 붙지 않는다.
 * @param url            스트림 주소. 관측소가 한 연결에 섞여 오므로 계측기별 치환이 없다.
 *                       나중에 nginx 를 타게 되면 이 값만 바꾸면 된다.
 * @param connectTimeout 연결 타임아웃. <b>읽기 타임아웃은 두지 않는다</b> — 끊기지 않는
 *                       스트림이라 읽기 제한을 걸면 정상 동작 중에 끊긴다.
 * @param reconnectDelay 연결이 끊긴 뒤 재시도까지 대기. 업체 서버가 죽었을 때 재연결 폭주를 막는다.
 * @param dropDuplicates 같은 시각에 다른 관측소와 값이 같은 샘플을 버릴지.
 *                       <b>기본 false</b> — NGV/NGT 중복이 업체 의도인지 확인 전이라, 버리면
 *                       실제 값까지 잃을 수 있다. 업체가 "NGT 값을 넣는 게 맞다" 고 하면 true 로
 *                       바꾸면 되고 코드는 안 건드린다.
 */
@ConfigurationProperties(prefix = "earthquake.realtime")
public record RealtimeProperties(
        boolean enabled,
        String url,
        Duration connectTimeout,
        Duration reconnectDelay,
        boolean dropDuplicates
) {
}
