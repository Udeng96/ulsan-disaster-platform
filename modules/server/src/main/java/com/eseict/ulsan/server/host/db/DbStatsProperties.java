package com.eseict.ulsan.server.host.db;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * db-stats.* 설정 — 3번 데이터베이스 상세의 ④ 연결 상대 · ⑤ 마지막 저장 · ⑥ 처리량.
 * 이 모듈은 3번 dbsvr 에서 돌고 같은 DB 에 붙어 있으므로 계정 개설 없이 DB 통계를 읽는다.
 *
 * enabled       : 기본 true. 끄면 세 칸은 「실측 대기」
 * host          : 대상 서버 (servers.host). 기본 dbsvr
 * schemaLabels  : 스키마 → 화면 이름 (「무엇이 들어왔나」 모듈별 정리). 없는 스키마는 이름 그대로
 */
@ConfigurationProperties(prefix = "db-stats")
public record DbStatsProperties(Boolean enabled, String host, Map<String, String> schemaLabels) {

    static final Map<String, String> DEFAULT_LABELS = Map.ofEntries(
            Map.entry("server", "관리자"), Map.entry("gis", "GIS"), Map.entry("cctv", "CCTV"),
            Map.entry("earthquake", "지진"), Map.entry("slope", "급경사지"), Map.entry("broadcast", "재난예경보"),
            Map.entry("signboard", "전광판"), Map.entry("owl", "부엉이"), Map.entry("weather", "기상"),
            Map.entry("common", "공통"), Map.entry("public", "기본"));

    public DbStatsProperties {
        if (enabled == null) enabled = true;
        if (host == null || host.isBlank()) host = "dbsvr";
        Map<String, String> m = new LinkedHashMap<>(DEFAULT_LABELS);
        if (schemaLabels != null) m.putAll(schemaLabels);
        schemaLabels = Map.copyOf(m);
    }

    public String label(String schema) {
        return schemaLabels.getOrDefault(schema, schema);
    }
}
