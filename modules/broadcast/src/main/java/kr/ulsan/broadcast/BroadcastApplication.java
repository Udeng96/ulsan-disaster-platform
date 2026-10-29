package kr.ulsan.broadcast;

import kr.ulsan.broadcast.signboard.SignboardProperties;
import kr.ulsan.broadcast.voice.VoiceProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.time.Clock;
import java.time.ZoneId;

/**
 * 재난예경보 방송 전달 모듈.
 *
 * <p>자동음성(화면 요청 → 업체 TCP 전송)과 재난 전광판(화면 요청 → 전광판마다 새 알림 전송)을
 * 담당한다. 이력·통신 로그는 DB 에 저장한다.
 */
@SpringBootApplication
// Scheduling is opt-in in the public source distribution.
@EnableConfigurationProperties({BroadcastProperties.class, VoiceProperties.class, SignboardProperties.class})
public class BroadcastApplication {

    public static void main(String[] args) {
        SpringApplication.run(BroadcastApplication.class, args);
    }

    /** 한국 시간대 기준 시계. 전광판 알림 만료 판정에 사용. */
    @Bean
    public Clock clock() {
        return Clock.system(ZoneId.of("Asia/Seoul"));
    }
}
