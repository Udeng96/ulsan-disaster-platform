package com.eseict.ulsan.earthquake.config;

import com.eseict.ulsan.earthquake.event.EventProperties;
import com.eseict.ulsan.earthquake.realtime.RealtimeProperties;
import java.net.URI;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 기동 직후 외부 연결 상태를 한 번에 찍는다.
 *
 * <p><b>업체 DB 는 이게 없으면 기동 시점에 접속 여부를 알 수 없다.</b> Hikari 는 커넥션을
 * 실제로 쓸 때까지 만들지 않아서, 계정·방화벽이 틀려도 조용히 뜨고 첫 수집(최대 1분 뒤)에서야
 * 실패가 드러난다. 배포 직후 바로 확인할 수 있어야 한다.
 *
 * <p>실시간 스트림은 여기서 접속하지 않는다 — 끊기지 않는 연결이라 점검용으로 붙였다 끊으면
 * 업체 쪽에 불필요한 연결이 생긴다. 설정 상태만 찍고, 실제 연결 여부는 구독기가
 * {@code 구독 시작} / {@code 구독 끊김} 으로 남긴다.
 */
@Component
@Slf4j
public class StartupCheck {

    private final JdbcTemplate ourDb;
    private final DataSourceProperties ourDbProperties;
    private final Optional<JdbcTemplate> vendorDb;
    private final RealtimeProperties realtime;
    private final EventProperties event;

    public StartupCheck(@Qualifier("jdbcTemplate") JdbcTemplate ourDb,
                        DataSourceProperties ourDbProperties,
                        @Qualifier("eventSourceJdbcTemplate") Optional<JdbcTemplate> vendorDb,
                        RealtimeProperties realtime,
                        EventProperties event) {
        this.ourDb = ourDb;
        this.ourDbProperties = ourDbProperties;
        this.vendorDb = vendorDb;
        this.realtime = realtime;
        this.event = event;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void report() {
        log.info("===== 기동 점검 =====");
        checkOurDb();
        checkVendorDb();
        reportRealtime();
        log.info("=====================");
    }

    /** 접속 대상과 연결 여부만 찍는다. 비밀번호는 찍지 않는다. */
    private void checkOurDb() {
        String target = describe(ourDbProperties.getUrl(), ourDbProperties.getUsername());
        try {
            ourDb.queryForObject("SELECT 1", Integer.class);
            log.info("[우리 DB]     OK   — {}", target);
        } catch (Exception e) {
            log.error("[우리 DB]     실패 — {} ({})", rootMessage(e), target);
        }
    }

    /**
     * JDBC url 에서 주소·포트·DB 이름을 뽑아 계정(아이디)과 함께 한 줄로.
     * 예) {@code 192.0.2.166:5432 / 2026_ulsan / 계정 rino_sos}
     */
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

    private void checkVendorDb() {
        if (vendorDb.isEmpty()) {
            log.info("[업체 DB]     꺼짐 — earthquake.event.polling=false");
            return;
        }
        try {
            // SELECT 1 만 던진다. COUNT(*) 는 업체 테이블이 크면 기동을 붙잡을 수 있다.
            vendorDb.get().queryForObject("SELECT 1", Integer.class);
            log.info("[업체 DB]     OK   — {}", vendorTarget());
        } catch (Exception e) {
            log.error("[업체 DB]     실패 — {} ({})", rootMessage(e), vendorTarget());
            log.error("             접속정보·방화벽·계정 권한을 확인할 것. 이벤트 수집이 동작하지 않는다");
        }
    }

    private void reportRealtime() {
        if (realtime.enabled()) {
            log.info("[실시간 구독] 켜짐 — {}", realtime.url());
        } else {
            log.info("[실시간 구독] 꺼짐 — earthquake.realtime.enabled=false");
        }
        if (event.polling()) {
            log.info("[EVENT] 이벤트 수집이 켜져있습니다");
        } else {
            log.info("[EVENT] 이벤트 수집이 꺼져있습니다");
        }
    }

    /** 우리 DB 와 같은 형식. 쿼리스트링(characterEncoding 등)은 {@link #describe} 가 뺀다. */
    private String vendorTarget() {
        EventProperties.Source source = event.source();
        return source == null ? "(미설정)" : describe(source.url(), source.username());
    }

    private static String rootMessage(Throwable e) {
        Throwable root = e;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        return root.getMessage();
    }
}
