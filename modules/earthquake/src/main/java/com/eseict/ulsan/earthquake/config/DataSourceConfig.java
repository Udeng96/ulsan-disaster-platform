package com.eseict.ulsan.earthquake.config;

import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * 적재 대상 DB (PostgreSQL {@code 2026_ulsan}).
 *
 * <p><b>이 빈을 직접 정의하는 이유</b> — 업체 DB 용 두 번째 {@link DataSource} 빈이 생기면
 * Spring Boot 의 {@code DataSourceAutoConfiguration} 이 {@code @ConditionalOnMissingBean}
 * 으로 물러난다. 자동설정에 맡겨두면 그 순간 JPA·Flyway 가 datasource 를 잃는다.
 * 그래서 이쪽을 명시적으로 만들고 {@link Primary} 를 붙인다.
 *
 * <p><b>{@link DataSourceProperties} 를 거치는 이유</b> — {@code spring.datasource} 를
 * DataSource 에 직접 바인딩하면 안 된다. Hikari 는 {@code url} 이 아니라 {@code jdbcUrl} 을
 * 요구해서 {@code "jdbcUrl is required with driverClassName"} 으로 기동이 실패한다.
 * {@code DataSourceProperties.initializeDataSourceBuilder()} 가 그 변환을 해준다.
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
     * <p><b>DataSource 와 같은 이유로 직접 만든다.</b> 업체 DB 용 JdbcTemplate 빈이 생기면
     * Spring Boot 의 {@code JdbcTemplateAutoConfiguration} 이
     * {@code @ConditionalOnMissingBean(JdbcOperations.class)} 로 물러나서, 자동설정에 맡기면
     * {@code earthquake.event.polling=true} 인 순간 우리 DB 용 JdbcTemplate 이 사라진다.
     */
    @Bean
    @Primary
    public JdbcTemplate jdbcTemplate(@Qualifier("dataSource") DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }
}
