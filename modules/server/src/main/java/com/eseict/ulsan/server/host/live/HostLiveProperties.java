package com.eseict.ulsan.server.host.live;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * host-live.* 설정 — 3번 말고 다른 서버 상세의 ④ 연결 상대 · ⑤ 최근 활동 · ⑥ 처리량 (사용자 2026-10-16).
 * 4~10·12번은 SSH 로 읽은 값(monitor.collector.ssh.targets). 여기는 그 밖의 규칙만.
 *
 * dbReceived : ⑤ ⑥ 을 3번 DB 기록으로 보일 서버 → 스키마 목록.
 *              5번 contsvr = 우리 모듈들(gis · slope · broadcast · owl-web …) 「마지막 수신 — 모듈들」 「오늘 수신 N건」
 *              13번 bungyisvr = 행정망이라 간접, 3번 DB 부엉이(owl) 수신 기록
 * mirror     : ⑤ ⑥ 을 다른 서버 기록으로 간접 표시. 11번 SecureGate 외부망 ← 10번 내부망(한 쌍)
 * staleAfter : SSH 로 읽은 값이 이보다 오래되면 「실측 대기」. 기본 10분 (수집 주기 60초의 10배와 같음)
 */
@ConfigurationProperties(prefix = "host-live")
public record HostLiveProperties(Map<String, List<String>> dbReceived, Map<String, String> mirror, Duration staleAfter) {

    static final Map<String, List<String>> DEFAULT_DB_RECEIVED = Map.of(
            "contsvr", List.of("gis", "slope", "broadcast", "signboard", "owl", "cctv", "earthquake", "weather"),
            "bungyisvr", List.of("owl"));
    static final Map<String, String> DEFAULT_MIRROR = Map.of("SecureGate-XDP-OUT", "SecureGate-XDP-IN");

    public HostLiveProperties {
        Map<String, List<String>> d = new LinkedHashMap<>(DEFAULT_DB_RECEIVED);
        if (dbReceived != null) d.putAll(dbReceived);
        dbReceived = Map.copyOf(d);
        Map<String, String> m = new LinkedHashMap<>(DEFAULT_MIRROR);
        if (mirror != null) m.putAll(mirror);
        mirror = Map.copyOf(m);
        if (staleAfter == null) staleAfter = Duration.ofMinutes(10);
    }
}
