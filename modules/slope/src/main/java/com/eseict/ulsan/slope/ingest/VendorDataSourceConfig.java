package com.eseict.ulsan.slope.ingest;

import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * 업체 상시계측 DB 접속 (읽기 전용).
 *
 * <p>기본 DataSource({@code 2026_ulsan})와 별개다. <b>이 빈이 존재하면 Spring Boot 의
 * DataSource 자동설정이 물러나므로</b>({@code @ConditionalOnMissingBean}) 기본 DataSource 는
 * {@link com.eseict.ulsan.slope.DataSourceConfig} 에서 {@code @Primary} 로 직접 선언한다.
 * 그 클래스를 지우면 Flyway·JPA 가 업체 DB 로 붙는다 — 이유는 그쪽 주석 참고.
 *
 * <p>읽기 전용 계정이라 트랜잭션 매니저를 두지 않고 {@link JdbcTemplate} 으로만 조회한다.
 */
@Configuration
@ConditionalOnProperty(name = "slope.vendor.enabled", havingValue = "true")
public class VendorDataSourceConfig {

    @Bean("vendorDataSource")
    public DataSource vendorDataSource(VendorProperties props) {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(props.url());
        ds.setUsername(props.username());
        ds.setPassword(props.password());
        ds.setDriverClassName("org.postgresql.Driver");
        ds.setPoolName("vendor");
        // 업체 DB 보호 — 화면이 몇 개든 동시 쿼리가 이 수를 넘지 않는다.
        ds.setMaximumPoolSize(props.maxPoolSize());
        ds.setReadOnly(true);
        // 망연계가 소리 없이 끊기면 JDBC 기본값(무한 대기)으로는 요청 스레드가 영영 묶인다.
        // 소켓 120초는 수집의 초기 적재(집계 30일치)도 견디는 값이다.
        ds.setConnectionTimeout(5_000);
        ds.addDataSourceProperty("socketTimeout", 120);
        return ds;
    }

    /**
     * <b>{@code @Qualifier} 가 반드시 필요하다.</b> 파라미터 이름 매칭은 후보가 여럿일 때만
     * 동작하는 폴백이라, 기본 DataSource 에 {@code @Primary} 가 붙어 있으면 이름과 무관하게
     * 그쪽이 주입된다. 그러면 업체 쿼리가 {@code 2026_ulsan} 으로 날아가 {@code ews} 스키마가
     * 없다며 문법 오류로 죽는다 (2026-09-02 실제로 그랬다).
     */
    @Bean
    public JdbcTemplate vendorJdbcTemplate(@Qualifier("vendorDataSource") DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }
}
