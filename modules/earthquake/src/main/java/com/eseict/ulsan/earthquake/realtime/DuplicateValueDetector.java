package com.eseict.ulsan.earthquake.realtime;

import java.util.HashMap;
import java.util.Map;

/**
 * 값 중복 감지 — 같은 시각에 <b>서로 다른 관측소</b>가 같은 {@code hpga}/{@code tpga} 를
 * 보내는 경우를 찾는다.
 *
 * <p>실데이터에서 <b>NGV 와 NGT 가 매초 소수점 8자리까지 일치</b>하는 것을 확인했다
 * (2026-08-24 화면 기록, 관측된 8개 시각 전건). NGV 는 1축(Y)이라 수평 2성분 합성({@code hpga})
 * 도 3성분({@code tpga})도 자체 산출할 수 없어, 업체가 같은 가상시설0714인 NGT 값을 채워 보내는
 * 것으로 의심된다. 업체 확인 대기 중.
 *
 * <p><b>찾기만 한다.</b> 세는 것은 {@link RealtimeStats}, 버릴지는 호출부가
 * {@code earthquake.realtime.drop-duplicates} 로 정한다.
 *
 * <p>특정 관측소를 이름으로 박아두지 않는다. 조건 자체를 보므로 업체가 고치면 자동으로 걸리지
 * 않고, 다른 관측소 쌍에서 생겨도 잡힌다.
 *
 * <p>구독 스레드 한 곳에서만 호출하므로 동기화하지 않는다.
 *
 * <p>원인이 정리되면 이 클래스는 지운다.
 */
class DuplicateValueDetector {

    /** 같은 시각 안에서만 비교한다. 시각이 바뀌면 비운다 — 메모리가 늘지 않는다. */
    private final Map<String, String> obsByValue = new HashMap<>();
    private String currentTime;

    /**
     * @return 같은 시각에 이미 같은 값을 보낸 <b>다른</b> 관측소 코드. 없으면 {@code null}.
     *         먼저 온 쪽은 {@code null} 이고 나중에 온 쪽만 값이 나온다 — 둘 다 버리면
     *         실측값까지 잃는다.
     */
    String findDuplicateOf(RealtimeSample sample) {
        String time = String.valueOf(sample.time());
        if (!time.equals(currentTime)) {
            currentTime = time;
            obsByValue.clear();
        }

        String value = sample.hpga() + "/" + sample.tpga();
        String previousObs = obsByValue.putIfAbsent(value, sample.obs());
        return (previousObs == null || previousObs.equals(sample.obs())) ? null : previousObs;
    }
}
