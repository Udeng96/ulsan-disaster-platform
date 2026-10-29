package com.eseict.common.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * KMA 계열 (기상청 / 에어코리아) open API 의 공통 응답 처리 헬퍼.
 *
 * 응답 shape 은 대부분 아래 형태:
 * <pre>
 * {
 *   "response": {
 *     "header": { "resultCode": "00", "resultMsg": "NORMAL_SERVICE" },
 *     "body":   { ... }
 *   }
 * }
 * </pre>
 *
 * resultCode:
 *   00 = 정상 (body 반환)
 *   03 = NODATA (빈 결과로 취급, 정상 흐름)
 *   그 외 = 에러 → {@link KmaApiException}
 */
public final class KmaResponseParser {

    public static final String CODE_OK = "00";
    public static final String CODE_NODATA = "03";

    private KmaResponseParser() {
    }

    /**
     * 원시 body 문자열을 JSON tree 로 파싱. blank / 비-JSON 응답은 KmaApiException.
     * (data.go.kr 게이트웨이는 실패 시 "Forbidden", "Unauthorized" 같은 평문을 반환하므로
     *  JSON 파싱 실패도 사실상 게이트웨이 에러로 취급.)
     */
    public static JsonNode parseTree(String body, ObjectMapper mapper) {
        if (body == null || body.isBlank()) {
            throw new KmaApiException("Empty response body");
        }
        try {
            return mapper.readTree(body);
        } catch (Exception e) {
            String preview = body.length() > 200 ? body.substring(0, 200) : body;
            throw new KmaApiException("Non-JSON response: " + preview, e);
        }
    }

    /**
     * response.header.resultCode 검사.
     *   00 → 통과 (호출자가 body 파싱 진행)
     *   03 → {@link #CODE_NODATA} 반환 (호출자가 빈 결과 리턴)
     *   그 외 → KmaApiException throw
     *
     * 반환값은 resultCode 문자열. 호출자는 CODE_NODATA 만 별도 처리하면 됨.
     */
    public static String requireOkOrNodata(JsonNode root) {
        JsonNode header = root.path("response").path("header");
        // 에어코리아 등 일부 서비스는 header 가 body 안에 있는 경우도 있음
        if (header.isMissingNode()) {
            header = root.path("response").path("body").path("header");
        }
        String code = header.path("resultCode").asText("");
        String msg = header.path("resultMsg").asText("");
        if (CODE_NODATA.equals(code)) return CODE_NODATA;
        if (code.isEmpty() || CODE_OK.equals(code)) return CODE_OK;
        throw new KmaApiException(code, msg);
    }

    /** response.body.items.item 노드 반환 (없으면 MissingNode). */
    public static JsonNode itemsNode(JsonNode root) {
        return root.path("response").path("body").path("items").path("item");
    }
}
