package com.eseict.ulsan.owl.collect;

import com.eseict.ulsan.owl.collect.dto.CollectedMessage;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * 도로명주소 검색 API(juso.go.kr)로 행정동·도로명주소를 보강한다.
 *
 * <p>부엉이는 행정동코드({@code dolcHdongCd})를 비워서 주고 도로명주소도 대부분 비어 있다.
 * 지번주소로 juso 를 조회하면 관할 행정동({@code hemdNm})과 도로명주소를 얻을 수 있어,
 * {@code regionName} 을 행정동으로 교체하고 비어 있는 {@code roadAddr} 을 채운다.
 *
 * <p>같은 주소를 매 폴링마다 다시 묻지 않도록 주소별로 캐시한다. 조회 실패 시에는 원본을
 * 그대로 반환한다 — 보강은 부가 기능이라 실패가 수집을 막아선 안 된다.
 *
 * <p>주의: 가이드상 {@code hemdNm} 은 "참고정보이며 실제와 다를 수 있음". 정확도가 더 필요하면
 * 행정표준코드 매핑 테이블로 교체할 수 있게 이 클래스만 갈아끼우면 된다.
 */
@Component
public class AddressEnricher {

    private static final Logger log = LoggerFactory.getLogger(AddressEnricher.class);

    /** 조회 실패/결과없음 캐시용 표식 (ConcurrentHashMap 은 null 을 담지 못한다). */
    private static final Juso NOT_FOUND = new Juso(null, null);

    private final boolean enabled;
    private final String confmKey;
    private final RestClient rest;
    private final Map<String, Juso> cache = new ConcurrentHashMap<>();

    public AddressEnricher(
            @Value("${owl.juso.enabled:true}") boolean enabled,
            @Value("${owl.juso.confm-key:}") String confmKey,
            @Value("${owl.juso.url:https://business.juso.go.kr/addrlink/addrLinkApi.do}") String url) {
        this.enabled = enabled;
        this.confmKey = confmKey;
        this.rest = RestClient.create(url);
    }

    /** 행정동/도로명주소를 채운 메시지. 보강할 게 없으면 원본 그대로. */
    public CollectedMessage enrich(CollectedMessage m) {
        if (!enabled || confmKey.isBlank() || !hasJibun(m.addr())) {
            return m;
        }
        Juso juso = cache.computeIfAbsent(m.addr(), this::lookup);
        if (juso == NOT_FOUND) {
            return m;
        }
        String regionName = juso.hemdNm() != null ? juso.hemdNm() : m.regionName();
        String roadAddr = m.roadAddr() != null ? m.roadAddr() : juso.roadAddr();
        return new CollectedMessage(
                m.msgId(), m.msgSn(), m.sendDtm(), m.msgType(),
                m.disasterTypeCode(), m.disasterTypeName(), m.title(),
                m.occurDtm(), m.endStatus(),
                regionName, m.addr(), roadAddr,
                m.lat(), m.lng(), m.summary());
    }

    /**
     * 지번(숫자)이 있는 주소인지. 동 이름까지만 있는 주소로 조회하면 juso 가 그 동의 임의
     * 주소를 골라 응답해서, 법정동이 여러 행정동에 걸친 경우 엉뚱한 행정동이 붙는다.
     * (예: "가상시설0565 달동" → 가상시설0412) 근거 없는 값을 넣느니 원본을 유지한다.
     */
    private static boolean hasJibun(String addr) {
        if (addr == null) {
            return false;
        }
        for (int i = 0; i < addr.length(); i++) {
            if (Character.isDigit(addr.charAt(i))) {
                return true;
            }
        }
        return false;
    }

    private Juso lookup(String addr) {
        try {
            JsonNode root = rest.get()
                    .uri(uri -> uri
                            .queryParam("confmKey", confmKey)
                            .queryParam("currentPage", 1)
                            .queryParam("countPerPage", 1)
                            .queryParam("keyword", addr)
                            .queryParam("resultType", "json")
                            .queryParam("addInfoYn", "Y")
                            .build())
                    .retrieve()
                    .body(JsonNode.class);
            if (root == null) {
                return NOT_FOUND;
            }
            JsonNode results = root.path("results");
            String errorCode = results.path("common").path("errorCode").asText("");
            if (!"0".equals(errorCode)) {
                log.warn("주소 조회 오류 [{}] {}: {}", errorCode,
                        results.path("common").path("errorMessage").asText(""), addr);
                return NOT_FOUND;
            }
            JsonNode first = results.path("juso").path(0);
            if (first.isMissingNode()) {
                return NOT_FOUND;
            }
            Juso juso = new Juso(blankToNull(first.path("hemdNm").asText(null)),
                    blankToNull(first.path("roadAddr").asText(null)));
            return juso.hemdNm() == null && juso.roadAddr() == null ? NOT_FOUND : juso;
        } catch (RuntimeException e) {
            log.warn("주소 조회 실패 [{}]: {}", addr, e.toString());
            return NOT_FOUND;
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }

    /** juso 조회 결과 중 우리가 쓰는 값. */
    private record Juso(String hemdNm, String roadAddr) {
    }
}
