package com.eseict.forecast.api;

import com.eseict.common.api.KmaApiException;
import com.eseict.common.api.KmaResponseParser;
import com.eseict.forecast.config.ForecastProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Component
public class ForecastClient {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HHmm");

    private final RestClient restClient;
    private final ForecastProperties properties;
    private final ObjectMapper objectMapper;

    public ForecastClient(@Qualifier("forecastRestClient") RestClient restClient,
                          ForecastProperties properties,
                          ObjectMapper objectMapper) {
        this.restClient = restClient;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    /** 초단기실황 (관측) — 카테고리별 obsrValue 리스트. */
    public List<ForecastItem> fetchObservation(int nx, int ny, LocalDateTime baseTimeKst) {
        return fetch("/getUltraSrtNcst", nx, ny, baseTimeKst, /*isForecast*/ false);
    }

    /** 초단기예보 — 카테고리별 fcstValue 리스트 (여러 fcstTime 포함). */
    public List<ForecastItem> fetchPrediction(int nx, int ny, LocalDateTime baseTimeKst) {
        return fetch("/getUltraSrtFcst", nx, ny, baseTimeKst, /*isForecast*/ true);
    }

    private List<ForecastItem> fetch(String path, int nx, int ny, LocalDateTime baseTimeKst, boolean isForecast) {
        String baseDate = baseTimeKst.format(DATE_FMT);
        String baseTime = baseTimeKst.format(TIME_FMT);

        String body;
        try {
            body = restClient.get()
                    .uri(ub -> ub
                            .path(path)
                            .queryParam("serviceKey", properties.serviceKey())
                            .queryParam("numOfRows", 1000)
                            .queryParam("pageNo", 1)
                            .queryParam("dataType", "JSON")
                            .queryParam("base_date", baseDate)
                            .queryParam("base_time", baseTime)
                            .queryParam("nx", nx)
                            .queryParam("ny", ny)
                            .build())
                    .retrieve()
                    .body(String.class);
        } catch (RestClientException e) {
            throw new KmaApiException("Forecast HTTP error: " + e.getMessage(), e);
        }

        JsonNode root = KmaResponseParser.parseTree(body, objectMapper);
        String code = KmaResponseParser.requireOkOrNodata(root);
        if (KmaResponseParser.CODE_NODATA.equals(code)) {
            return List.of();
        }

        JsonNode items = KmaResponseParser.itemsNode(root);
        List<ForecastItem> out = new ArrayList<>();
        if (items.isArray()) {
            for (JsonNode n : items) out.add(toItem(n, isForecast));
        } else if (items.isObject()) {
            out.add(toItem(items, isForecast));
        }
        return out;
    }

    private static ForecastItem toItem(JsonNode n, boolean isForecast) {
        return new ForecastItem(
                n.path("baseDate").asText(),
                n.path("baseTime").asText(),
                n.path("category").asText(),
                isForecast ? n.path("fcstDate").asText() : n.path("baseDate").asText(),
                isForecast ? n.path("fcstTime").asText() : n.path("baseTime").asText(),
                isForecast ? n.path("fcstValue").asText() : n.path("obsrValue").asText()
        );
    }
}
