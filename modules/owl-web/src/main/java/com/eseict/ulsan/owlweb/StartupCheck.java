package com.eseict.ulsan.owlweb;

import java.net.URI;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 기동 직후 접속 정보와 연결 상태를 한 번에 찍는다. 비밀번호는 찍지 않는다.
 *
 * <p>Hikari 는 커넥션을 실제로 쓸 때까지 만들지 않아서, 계정·방화벽이 틀려도 조용히 뜬다.
 * 여기서 {@code SELECT 1} 을 던져 배포 직후 바로 확인할 수 있게 한다.
 * owl 연결 결과({@code [OWL] 수집서버에 연결되었습니다.})는 첫 폴링에서 찍힌다.
 *
 * <p>첫 폴링({@code OwlEventPoller})보다 먼저 찍히도록 가장 앞 순서로 둔다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StartupCheck {

    private final JdbcTemplate jdbcTemplate;
    private final DataSourceProperties dataSourceProperties;
    private final Environment env;

    @Order(Ordered.HIGHEST_PRECEDENCE)
    @EventListener(ApplicationReadyEvent.class)
    public void report() {
        log.info("===== 기동 점검 =====");
        checkDb();
        String port = env.getProperty("local.server.port", env.getProperty("server.port", "8080"));
        String contextPath = env.getProperty("server.servlet.context-path", "/");
        log.info("[PORT] {}", port);
        log.info("[END-POINT] http://<서버>:{}{}", port, contextPath);
        if (!env.getProperty("owl.collect.enabled", Boolean.class, true)) {
            log.info("[OWL] 이벤트 수집이 꺼져있습니다");
        }
        log.info("=====================");
    }

    private void checkDb() {
        String target = describe(dataSourceProperties.getUrl(), dataSourceProperties.getUsername());
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            log.info("[DB] OK — {}", target);
        } catch (Exception e) {
            log.error("[DB] 실패 — {} ({})", rootMessage(e), target);
        }
    }

    /** JDBC url 에서 주소·포트·DB 이름을 뽑아 계정과 함께. 예) 192.0.2.166:5432 / 2026_ulsan / 계정 rino_sos */
    private static String describe(String jdbcUrl, String username) {
        if (jdbcUrl == null) {
            return "(미설정)";
        }
        try {
            URI uri = URI.create(jdbcUrl.substring("jdbc:".length()));
            String database = uri.getPath() == null ? "" : uri.getPath().replaceFirst("^/", "");
            return "%s:%d / %s / 계정 %s".formatted(uri.getHost(), uri.getPort(), database, username);
        } catch (Exception e) {
            return jdbcUrl + " / 계정 " + username;   // 형식이 예상과 다르면 url 을 그대로
        }
    }

    private static String rootMessage(Throwable e) {
        Throwable root = e;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        return root.getMessage();
    }
}
