package com.eseict.ulsan.gis;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

/**
 * 애플리케이션 진입점.
 *
 * <p>{@link SpringBootServletInitializer} 상속 — WAR 로 패키징해도
 * executable ({@code java -jar gis.war}, 내장 톰캣) / 외부 톰캣 배포 둘 다 가능.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class GisApplication extends SpringBootServletInitializer {

    public static void main(String[] args) {
        SpringApplication.run(GisApplication.class, args);
    }

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        return application.sources(GisApplication.class);
    }
}
