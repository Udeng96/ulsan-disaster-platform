package com.eseict.ulsan.server.config;

import com.eseict.ulsan.server.domain.ServerJudge;
import com.eseict.ulsan.server.domain.Staleness;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
public class JudgeConfig {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }

    /** 판정 엔진은 하나뿐이다. 수집 주기가 바뀌면 오래됨 기준도 같이 바뀐다. */
    @Bean
    public ServerJudge serverJudge(MonitorProperties props) {
        return new ServerJudge(new Staleness(props.collector().interval()));
    }
}
