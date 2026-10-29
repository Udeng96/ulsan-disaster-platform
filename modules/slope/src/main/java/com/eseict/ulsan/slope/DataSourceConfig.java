package com.eseict.ulsan.slope;

import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * 기본 DataSource ({@code 2026_ulsan}) — JPA·Flyway 가 쓴다.
 *
 * <p><b>자동설정에 맡길 수 없어 직접 선언한다.</b> Spring Boot 의 {@code DataSourceAutoConfiguration}
 * 은 {@code @ConditionalOnMissingBean(DataSource.class)} 라서, 업체 DataSource
 * ({@link com.eseict.ulsan.slope.ingest.VendorDataSourceConfig})가 만들어지는 순간 통째로
 * 물러난다. 그러면 컨텍스트에 업체 DataSource 하나만 남아 <b>Flyway 와 JPA 가 업체 DB 로
 * 붙는다.</b>
 *
 * <p>실제로 그렇게 터졌다 (2026-09-02): {@code slope.vendor.enabled=true} 로 켜자 Flyway 가
 * {@code ewsi_us} 에 {@code CREATE SCHEMA slope} 를 시도해 읽기 전용 트랜잭션 오류로 기동 실패.
 * {@code enabled=false} 가 기본이라 그동안 드러나지 않았을 뿐, 운영에서 켜는 순간 같은 곳에서
 * 멈췄을 문제다.
 *
 * <p>{@code @Primary} 가 붙어 있으니 업체 DataSource 를 쓰려면 이름으로 받아야 한다
 * ({@code vendorJdbcTemplate}).
 */
@Configuration
public class DataSourceConfig {

    @Bean
    @Primary
    @ConfigurationProperties("spring.datasource")
    public DataSourceProperties dataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    @Primary
    public DataSource dataSource(DataSourceProperties properties) {
        return properties.initializeDataSourceBuilder().build();
    }

    /**
     * 우리 DB 용 {@link JdbcTemplate}.
     *
     * <p>이것도 자동설정에 맡길 수 없다. {@code JdbcTemplateAutoConfiguration} 이
     * {@code @ConditionalOnMissingBean(JdbcOperations.class)} 라서, 업체
     * {@code vendorJdbcTemplate} 이 만들어지는 순간 물러난다. 그러면 컨텍스트에 업체용
     * 하나만 남아, 우리 DB 용으로 주입받는 JdbcTemplate 이 업체 DB 를 가리키게 된다.
     */
    @Bean
    @Primary
    public JdbcTemplate jdbcTemplate(@Qualifier("dataSource") DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }
}
