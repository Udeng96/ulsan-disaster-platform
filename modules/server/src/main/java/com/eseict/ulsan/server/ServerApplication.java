package com.eseict.ulsan.server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 서버 운영 수집 모듈 진입점. WAR 로 executable / 외부 톰캣 둘 다 되게 SpringBootServletInitializer 상속.
 * 방화벽·스위치(SNMP)와 서버 13대(판정·SSH) 수집을 한 모듈에서 돈다. 설정은 외부 application.yml 이 우선한다.
 */
@SpringBootApplication
// Scheduling is opt-in in the public source distribution.
@ConfigurationPropertiesScan
public class ServerApplication extends SpringBootServletInitializer {

    public static void main(String[] args) {
        SpringApplication.run(ServerApplication.class, args);
    }

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder builder) {
        return builder.sources(ServerApplication.class);
    }
}
