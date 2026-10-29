package com.eseict.ulsan.owlweb.ingest;

import com.eseict.ulsan.owlweb.ingest.dto.CollectedMessage;
import java.time.Duration;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * 연계모듈(owl) 조회 클라이언트 — {@code GET ${owl.collect.url}}.
 *
 * <p>owl 은 요청 시점에 부엉이(상황전파 표준 API)를 조회해 그 결과를 응답한다(pull).
 * 중복 응답은 정상이며, 저장 단계의 {@code (msgId, msgSn)} 멱등 처리로 흡수한다.
 *
 * <p>폴링 주기(기본 3초)보다 오래 매달리지 않도록 connect/read 타임아웃을 명시한다
 * (기본값 무제한이면 owl 이 응답을 안 줄 때 스케줄러 스레드가 계속 붙잡힌다).
 */
@Component
public class OwlCollectClient {

    /** 응답 본문 타입. 런타임에 제네릭 슈퍼타입을 읽으므로 타입 인자를 명시한다(diamond 금지). */
    private static final ParameterizedTypeReference<List<CollectedMessage>> MESSAGE_LIST =
            new ParameterizedTypeReference<List<CollectedMessage>>() {
            };

    private final RestClient restClient;
    private final String url;

    public OwlCollectClient(
            @Value("${owl.collect.url}") String url,
            @Value("${owl.collect.connect-timeout-ms:2000}") long connectTimeoutMs,
            @Value("${owl.collect.read-timeout-ms:5000}") long readTimeoutMs) {
        this.url = url;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        factory.setReadTimeout(Duration.ofMillis(readTimeoutMs));
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    /** owl 이 조회한 최근 부엉이 메시지 목록. 응답 본문이 비면 빈 리스트. */
    public List<CollectedMessage> fetch() {
        List<CollectedMessage> body = restClient.get()
                .uri(url)
                .retrieve()
                .body(MESSAGE_LIST);
        return body != null ? body : List.of();
    }
}
