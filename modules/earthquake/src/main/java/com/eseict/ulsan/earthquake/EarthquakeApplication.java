package com.eseict.ulsan.earthquake;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 애플리케이션 진입점.
 *
 * <p>지진 모듈. 지진 계측기 정보를 관리하고, 지진 발생 이벤트를 업체 DB 조회로, 실시간
 * 이벤트를 지진쪽 API 요청으로 수집한다.
 *
 * <p>{@link SpringBootServletInitializer} 상속 — WAR 로 패키징해도 executable
 * ({@code java -jar earthquake.war}, 내장 톰캣) / 외부 톰캣 배포 둘 다 가능.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
// Scheduling is opt-in in the public source distribution.
public class EarthquakeApplication extends SpringBootServletInitializer {

    public static void main(String[] args) {
        SpringApplication.run(EarthquakeApplication.class, args);
    }

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        return application.sources(EarthquakeApplication.class);
    }
}
