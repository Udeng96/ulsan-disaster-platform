package com.eseict.radar.api;

import com.eseict.common.api.KmaApiException;
import com.eseict.common.api.KmaResponseParser;
import com.eseict.radar.config.RadarProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * 기상청 레이더영상 조회서비스 — getCmpImg (레이더 합성영상).
 * 응답: rdr-img-file URL 배열.
 *
 * 활용신청 대기 중이거나 KMA 백엔드 장애 시 "Forbidden" / "502" 등 평문이 반환되므로
 * KmaResponseParser 가 JSON 파싱 실패 시 KmaApiException 을 던진다.
 * 스케줄러가 이를 잡아 로그만 남기고 다음 사이클에 재시도.
 */
@Component
public class RadarClient {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final RestClient restClient;
    private final RadarProperties properties;
    private final ObjectMapper objectMapper;

    public RadarClient(@Qualifier("radarRestClient") RestClient restClient,
                          RadarProperties properties,
                          ObjectMapper objectMapper) {
        this.restClient = restClient;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public List<String> fetchImageUrls(LocalDate date) {
        String body;
        try {
            body = restClient.get()
                    .uri(ub -> ub
                            .path("/getCmpImg")
                            .queryParam("serviceKey", properties.serviceKey())
                            .queryParam("numOfRows", 1000)
                            .queryParam("pageNo", 1)
                            .queryParam("dataType", "JSON")
                            .queryParam("data", properties.dataType())
                            .queryParam("time", date.format(DATE_FMT))
                            .build())
                    .retrieve()
                    .body(String.class);
        } catch (RestClientException e) {
            throw new KmaApiException("Radar HTTP error: " + e.getMessage(), e);
        }

        JsonNode root = KmaResponseParser.parseTree(body, objectMapper);
        String code = KmaResponseParser.requireOkOrNodata(root);
        if (KmaResponseParser.CODE_NODATA.equals(code)) {
            return List.of();
        }

        JsonNode itemNode = KmaResponseParser.itemsNode(root);
        List<String> urls = new ArrayList<>();
        if (itemNode.isArray()) {
            for (JsonNode n : itemNode) collectUrls(n, urls);
        } else if (itemNode.isObject()) {
            collectUrls(itemNode, urls);
        }
        return urls;
    }

    private static void collectUrls(JsonNode itemObj, List<String> out) {
        JsonNode file = itemObj.path("rdr-img-file");
        if (file.isArray()) {
            file.forEach(f -> {
                if (f.isTextual() && !f.asText().isBlank()) out.add(f.asText());
            });
        } else if (file.isTextual() && !file.asText().isBlank()) {
            out.add(file.asText());
        }
    }
}
