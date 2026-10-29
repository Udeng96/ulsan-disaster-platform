package com.eseict.airquality.api;

import com.eseict.airquality.config.AirqualityProperties;
import com.eseict.common.api.KmaApiException;
import com.eseict.common.api.KmaResponseParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * 한국환경공단 에어코리아 — 측정소별 실시간 측정정보.
 * getMsrstnAcctoRltmMesureDnsty
 *   stationName: "가상시설0480", dataTerm: DAILY, ver: 1.0
 * 응답: items[] (최근 24시간 분량, 시각순)
 *
 * 응답 shape 이 다른 KMA 서비스와 살짝 달라
 * (items 가 곧 배열, 그 아래 item 이 아님) itemsNode() 헬퍼 대신 직접 접근.
 */
@Component
public class AirqualityClient {

    private static final Logger log = LoggerFactory.getLogger(AirqualityClient.class);

    private final RestClient restClient;
    private final AirqualityProperties properties;
    private final ObjectMapper objectMapper;

    public AirqualityClient(@Qualifier("airqualityRestClient") RestClient restClient,
                            AirqualityProperties properties,
                            ObjectMapper objectMapper) {
        this.restClient = restClient;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public List<JsonNode> fetchByStation(String stationName) {
        // VALUES_ONLY 모드 + 한글 stationName 조합에서 400 발생 (Spring URI builder 가 일부 인코딩 처리 차이).
        // 우회: URL 을 String 으로 직접 build (encode 명시).
        String url = properties.baseUrl()
                + "/getMsrstnAcctoRltmMesureDnsty"
                + "?serviceKey=" + URLEncoder.encode(properties.serviceKey(), StandardCharsets.UTF_8)
                + "&returnType=json"
                + "&numOfRows=24"
                + "&pageNo=1"
                + "&stationName=" + URLEncoder.encode(stationName, StandardCharsets.UTF_8)
                + "&dataTerm=DAILY"
                + "&ver=1.0";

        String body;
        try {
            body = restClient.get()
                    .uri(URI.create(url))
                    .retrieve()
                    .body(String.class);
        } catch (RestClientException e) {
            throw new KmaApiException("AirKorea HTTP error: " + e.getMessage(), e);
        }

        JsonNode root = KmaResponseParser.parseTree(body, objectMapper);
        String code = KmaResponseParser.requireOkOrNodata(root);
        if (KmaResponseParser.CODE_NODATA.equals(code)) {
            return List.of();
        }

        // 에어코리아는 items 자체가 배열 (다른 KMA 서비스는 items.item 이 배열)
        JsonNode items = root.path("response").path("body").path("items");
        List<JsonNode> out = new ArrayList<>();
        if (items.isArray()) {
            items.forEach(out::add);
        }
        log.debug("Fetched {} air quality rows for station={}", out.size(), stationName);
        return out;
    }
}
