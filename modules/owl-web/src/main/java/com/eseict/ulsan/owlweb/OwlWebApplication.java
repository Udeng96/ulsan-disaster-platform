package com.eseict.ulsan.owlweb;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 애플리케이션 진입점 (내부망 부엉이 이벤트 서비스).
 *
 * <p>행정망 연계모듈(owl)의 {@code GET /owl/collect} 를 주기 폴링해 DB 에 적재하고,
 * 신규 이벤트를 SSE 로 관제 대시보드(gis-front)에 실시간 push 한다.
 * 부엉이(상황전파 표준 API)와의 직접 통신은 owl 이 담당하고, 이 모듈은 owl 만 바라본다.
 *
 * <p>{@link SpringBootServletInitializer} 상속 — WAR 로 패키징해도 executable
 * ({@code java -jar owl-web.war}, 내장 톰캣) / 외부 톰캣 배포 둘 다 가능.
 * {@link EnableScheduling} — {@code OwlEventPoller} 의 주기 폴링 + SSE heartbeat 용.
 */
@SpringBootApplication
// Scheduling is opt-in in the public source distribution.
public class OwlWebApplication extends SpringBootServletInitializer {

    public static void main(String[] args) {
        SpringApplication.run(OwlWebApplication.class, args);
    }

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        return application.sources(OwlWebApplication.class);
    }
}
