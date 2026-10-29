package com.eseict.warning.api;

import com.eseict.common.api.KmaApiException;
import com.eseict.common.api.KmaResponseParser;
import com.eseict.warning.config.WarningProperties;
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
 * 기상청 기상특보 조회서비스 — getWthrWrnList.
 * fromTmFc / toTmFc 사이에 발표된 특보 리스트.
 */
@Component
public class WarningClient {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final RestClient restClient;
    private final WarningProperties properties;
    private final ObjectMapper objectMapper;

    public WarningClient(@Qualifier("warningRestClient") RestClient restClient,
                         WarningProperties properties,
                         ObjectMapper objectMapper) {
        this.restClient = restClient;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public List<JsonNode> fetchList(String stnId, LocalDate from, LocalDate to) {
        String fromStr = from.format(DATE_FMT);
        String toStr = to.format(DATE_FMT);

        String body;
        try {
            body = restClient.get()
                    .uri(ub -> ub
                            .path("/getWthrWrnList")
                            .queryParam("serviceKey", properties.serviceKey())
                            .queryParam("numOfRows", 100)
                            .queryParam("pageNo", 1)
                            .queryParam("dataType", "JSON")
                            .queryParam("stnId", stnId)
                            .queryParam("fromTmFc", fromStr)
                            .queryParam("toTmFc", toStr)
                            .build())
                    .retrieve()
                    .body(String.class);
        } catch (RestClientException e) {
            throw new KmaApiException("Warning HTTP error: " + e.getMessage(), e);
        }

        JsonNode root = KmaResponseParser.parseTree(body, objectMapper);
        String code = KmaResponseParser.requireOkOrNodata(root);
        if (KmaResponseParser.CODE_NODATA.equals(code)) {
            return List.of();
        }

        JsonNode items = KmaResponseParser.itemsNode(root);
        List<JsonNode> out = new ArrayList<>();
        if (items.isArray()) {
            items.forEach(out::add);
        } else if (items.isObject()) {
            out.add(items);
        }
        return out;
    }
}
