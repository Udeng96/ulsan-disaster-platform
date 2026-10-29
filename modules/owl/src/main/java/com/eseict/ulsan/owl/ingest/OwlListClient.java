package com.eseict.ulsan.owl.ingest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

/**
 * 부엉이 목록 조회 — {@code MsgList.do} 를 <b>직접</b> 호출한다.
 *
 * <p>벤더 JAR 의 {@code MsgApi.getMsgList} 는 응답 JSON 의 위치 필드({@code dolcNm} 등
 * {@code dolc*} 전부)를 파싱에서 버린다(바이트코드 확인). 그러면 목록 단계에서 관내 건을
 * 걸러낼 수 없어서, 목록만 JAR 을 거치지 않고 원본 JSON 을 받는다. 요청 형식은 JAR 과 같다:
 * POST, {@code application/x-www-form-urlencoded}, utf-8.
 *
 * <p><b>수신기관({@code rcvOrgCd})으로 조회한다</b> — 사용신청서의 조회 조건이
 * "가상시설0565가 수신한 상황전파메시지" 이다.
 *
 * <p>발신일자 범위와 페이징이 함께 있어야 목록이 온다 — 날짜가 없으면 0건, 페이징이 없으면
 * 건수({@code totCnt})만 오고 목록은 빈 배열. 자정 경계에서 직전 메시지를 놓치지 않도록
 * 어제~오늘 2일치를 조회한다 (중복은 내부망이 {@code (msgId, msgSn)} 으로 걸러 저장).
 */
@Component
public class OwlListClient {

    /** 조회조건 발신일자 형식 (문서: yyyyMMdd). */
    private static final DateTimeFormatter SND_DE = DateTimeFormatter.ofPattern("yyyyMMdd");

    /** 목록 조회 경로. JAR 의 {@code getMsgList} 가 쓰는 것과 같은 엔드포인트다. */
    private static final String LIST_PATH = "/idsiISM/ism/ap/msg/api/MsgList.do";

    private final String orgCd;
    private final String usrId;
    private final String listUrl;
    private final RestClient rest;
    private final ObjectMapper json = new ObjectMapper();

    public OwlListClient(@Value("${owl.ingest.msgapi.domain}") String domain,
                         @Value("${owl.ingest.msgapi.org-cd}") String orgCd,
                         @Value("${owl.ingest.msgapi.usr-id}") String usrId) {
        this.orgCd = orgCd;
        this.usrId = usrId;
        this.listUrl = "http://" + domain + LIST_PATH;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(30));
        this.rest = RestClient.builder().requestFactory(factory).build();
    }

    /** 어제~오늘 수신 목록 (위치명 포함). 응답이 비면 빈 리스트. */
    public List<ListItem> fetch() throws Exception {
        LocalDate today = LocalDate.now();
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("usrId", usrId);
        form.add("orgCd", orgCd);
        form.add("rcvOrgCd", orgCd);
        form.add("sndDtFrom", today.minusDays(1).format(SND_DE));
        form.add("sndDtTo", today.format(SND_DE));
        form.add("firstIndex", "0");
        form.add("lastIndex", "1000");

        String body = rest.post()
                .uri(listUrl)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(String.class);

        List<ListItem> items = new ArrayList<>();
        if (body == null || body.isBlank()) {
            return items;
        }
        JsonNode list = json.readTree(body).path("list");
        if (list.isArray()) {
            for (JsonNode item : list) {
                items.add(new ListItem(text(item, "msgId"), text(item, "msgSn"), text(item, "dolcNm")));
            }
        }
        return items;
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return v.isNull() || v.isMissingNode() ? null : v.asText();
    }

    /** 목록 1건에서 쓰는 값. 나머지(좌표·주소·재난유형 등)는 상세에만 있다. */
    public record ListItem(String msgId, String msgSn, String dolcNm) {

        public String key() {
            return msgId + "|" + msgSn;
        }
    }
}
