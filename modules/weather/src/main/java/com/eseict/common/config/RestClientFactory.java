package com.eseict.common.config;

import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.DefaultUriBuilderFactory;

import java.time.Duration;

/**
 * 공통 RestClient 빌더. data.go.kr 키가 base64로 '+' '/' '='를 포함하므로
 * VALUES_ONLY 인코딩 모드를 적용해 쿼리 값만 1회 URL 인코딩한다.
 */
public final class RestClientFactory {

    private RestClientFactory() {
    }

    public static RestClient build(String baseUrl, int timeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(timeoutMs));
        factory.setReadTimeout(Duration.ofMillis(timeoutMs));

        DefaultUriBuilderFactory uriBuilderFactory = new DefaultUriBuilderFactory(baseUrl);
        uriBuilderFactory.setEncodingMode(DefaultUriBuilderFactory.EncodingMode.VALUES_ONLY);

        return RestClient.builder()
                .requestFactory(factory)
                .uriBuilderFactory(uriBuilderFactory)
                .build();
    }
}
