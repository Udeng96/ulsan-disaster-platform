package com.eseict.ulsan.earthquake.event;

import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * 업체 DB 접속 (이벤트 조회용). MariaDB {@code accdb} — 드라이버는 build.gradle 에 있다.
 *
 * <p>{@code earthquake.event.polling=false} 면 이 설정 전체가 적용되지 않는다 — 접속정보가
 * 비어 있는 동안 빈 생성으로 기동이 실패하지 않게 하기 위함.
 *
 * <p><b>JPA 가 아니라 {@link JdbcTemplate} 을 쓴다.</b> 업체 스키마는 우리가 소유하지 않고
 * 읽기만 한다 — 엔티티/마이그레이션 관리 대상이 아니다. JPA·Flyway 는 우리 DB 에만 붙는다
 * (cctv-sync 가 외부 소스를 읽을 때와 같은 방식).
 *
 */
@Configuration
@ConditionalOnProperty(prefix = "earthquake.event", name = "polling", havingValue = "true")
public class EventSourceConfig {

    @Bean
    public DataSource eventSourceDataSource(EventProperties properties) {
        EventProperties.Source source = properties.source();
        return DataSourceBuilder.create()
                .url(source.url())
                .username(source.username())
                .password(source.password())
                .driverClassName(source.driverClassName())
                .build();
    }

    /**
     * 업체 DB 조회 전용. <b>읽기만 한다</b> — 남의 시스템이라 쓰지 않는다.
     *
     * <p><b>{@link Qualifier} 가 없으면 우리 DB 에 붙는다.</b> {@link DataSource} 빈이 둘이라
     * 타입만으로는 후보가 여러 개고, 그때 Spring 은 파라미터 이름을 보기 전에 {@code @Primary}
     * (우리 PostgreSQL)를 고른다. 실제로 그렇게 물려서 업체 쿼리가 우리 DB 로 날아갔다
     * (2026-08-24, 테스트로 발견).
     */
    @Bean
    public JdbcTemplate eventSourceJdbcTemplate(
            @Qualifier("eventSourceDataSource") DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }
}
