package com.eseict.common.config;

import com.eseict.airquality.config.AirqualityProperties;
import com.eseict.forecast.config.ForecastProperties;
import com.eseict.radar.config.RadarProperties;
import com.eseict.warning.config.WarningProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * 모든 KMA / 에어코리아 모듈용 RestClient 빈을 한 곳에 정의.
 * (예전에는 모듈마다 *RestClientConfig.java 를 하나씩 두어 5개로 중복되어 있었음.)
 *
 * 각 클라이언트가 @Qualifier 로 자기 모듈의 빈을 지정해 주입받는다.
 */
@Configuration
public class KmaRestClientConfig {

    @Bean
    public RestClient forecastRestClient(ForecastProperties p) {
        return RestClientFactory.build(p.baseUrl(), p.timeoutMs());
    }

    @Bean
    public RestClient radarRestClient(RadarProperties p) {
        return RestClientFactory.build(p.baseUrl(), p.timeoutMs());
    }

    @Bean
    public RestClient warningRestClient(WarningProperties p) {
        return RestClientFactory.build(p.baseUrl(), p.timeoutMs());
    }

    @Bean
    public RestClient airqualityRestClient(AirqualityProperties p) {
        return RestClientFactory.build(p.baseUrl(), p.timeoutMs());
    }
}
