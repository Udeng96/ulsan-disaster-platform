package com.eseict.ulsan.owl;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 애플리케이션 진입점.
 *
 * <p>부엉이(상황전파 표준 API) 연계 모듈(행정망). 5분마다 부엉이를 조회해 두고,
 * 내부망 owl-web 이 {@code GET /owl/collect} 를 요청하면 그 목록을 응답한다.
 * DB 저장/실시간 push 는 내부망(owl-web) 책임.
 *
 * <p>{@link SpringBootServletInitializer} 상속 — WAR 로 패키징해도 executable
 * ({@code java -jar owl.war}, 내장 톰캣) / 외부 톰캣 배포 둘 다 가능.
 */
@SpringBootApplication
// Scheduling is opt-in in the public source distribution.
public class OwlApplication extends SpringBootServletInitializer {

    public static void main(String[] args) {
        SpringApplication.run(OwlApplication.class, args);
    }

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        return application.sources(OwlApplication.class);
    }
}
