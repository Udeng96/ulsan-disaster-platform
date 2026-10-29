package com.eseict.ulsan.slope;

import java.util.TimeZone;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 애플리케이션 진입점.
 *
 * <p>급경사지 모듈. 업체 상시계측 DB 를 읽어 관제 화면 조회 API 를 제공한다.
 *
 * <p>{@link SpringBootServletInitializer} 상속 — WAR 로 패키징해도 executable
 * ({@code java -jar slope.war}, 내장 톰캣) / 외부 톰캣 배포 둘 다 가능.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
// Scheduling is opt-in in the public source distribution.
public class SlopeApplication extends SpringBootServletInitializer {

    /*
     * 시간대를 KST 로 고정한다. 업체 DB 시각이 KST 로 저장되어 있고, 발령 필요의 25시간·180분 창과
     * 수집 워터마크를 LocalDateTime.now() 로 만든다. 서버 JVM 이 UTC 로 뜨면 9시간 어긋난다.
     * java -jar 와 외부 톰캣(WAR) 둘 다 이 클래스를 먼저 읽으므로 여기 둔다.
     */
    static {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));
    }

    public static void main(String[] args) {
        SpringApplication.run(SlopeApplication.class, args);
    }

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        return application.sources(SlopeApplication.class);
    }
}
