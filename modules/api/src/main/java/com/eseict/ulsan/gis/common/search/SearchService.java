package com.eseict.ulsan.gis.common.search;

import com.eseict.ulsan.gis.common.web.ApiException;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * 주소 검색 서비스 — 도로명주소 API(juso) 통합검색 + vWorld 지오코더 좌표 조회.
 *
 * <p>흐름:
 * <ol>
 *   <li>juso {@code addrLinkApi} 로 키워드 통합검색 (도로명 / 지번 / 건물명 한 번에).
 *       도로명만 넣어도 그 도로의 주소 전부를 페이징으로 반환하고, 띄어쓰기에 무관하다.</li>
 *   <li>결과 각 주소를 vWorld 지오코더로 좌표(EPSG:4326)로 변환 (병렬).</li>
 * </ol>
 *
 * <p>울산 밖 결과 노이즈를 줄이기 위해 키워드에 "울산" 이 없으면 붙이고, 최종적으로 주소에
 * "울산" 이 포함된 건만 통과시킨다. 좌표를 구하지 못한 건은 제외한다 (graceful).
 *
 * <p>외부 호출 타임아웃은 {@code spring.http.client.connect-timeout / read-timeout} (application.yml).
 */
@Service
@Slf4j
public class SearchService {

    private final JusoProperties juso;
    private final VWorldProperties vworld;
    private final RestClient client;

    public SearchService(JusoProperties juso, VWorldProperties vworld, RestClient.Builder builder) {
        this.juso = juso;
        this.vworld = vworld;
        this.client = builder.build();
    }

    public List<SearchResultItem> search(String query, int page) {
        String trimmed = query == null ? "" : query.trim();
        if (trimmed.isEmpty()) return List.of();

        // 울산 한정: juso 는 토큰 AND 매칭이라 "울산" prefix 로 타 지역 주소를 걸러 지오코딩 호출도 절감
        String keyword = trimmed.contains("울산") ? trimmed : "울산 " + trimmed;

        List<JusoResponse.Juso> addresses = searchJuso(keyword, Math.max(page, 1));
        if (addresses.isEmpty()) return List.of();

        // 건물명 매칭(bdNm) 우선 → 도로명/지번만 매칭된 건 뒤로 (juso 순서는 그룹 내 유지)
        List<JusoResponse.Juso> ordered = addresses.stream()
                .sorted(Comparator.comparingInt(j -> hasText(j.bdNm()) ? 0 : 1))
                .toList();

        // 결과마다 좌표 조회 — 병렬
        List<CompletableFuture<SearchResultItem>> futures = ordered.stream()
                .map(j -> CompletableFuture.supplyAsync(() -> toResultItem(j)))
                .toList();

        return futures.stream()
                .map(CompletableFuture::join)
                .filter(Objects::nonNull)
                .filter(this::isInUlsan)
                .toList();
    }

    /**
     * juso 통합검색 — juso 가 돌려준 에러코드 / 결과 없음은 빈 리스트.
     * 접속 실패·타임아웃·HTTP 오류는 {@link ApiException}(502 SEARCH_UNAVAILABLE).
     */
    private List<JusoResponse.Juso> searchJuso(String keyword, int page) {
        try {
            String uri = UriComponentsBuilder.fromUriString(juso.baseUrl())
                    .queryParam("confmKey",     juso.confmKey())
                    .queryParam("currentPage",  page)
                    .queryParam("countPerPage", juso.countPerPage())
                    .queryParam("keyword",      keyword)
                    .queryParam("resultType",   "json")
                    .build()
                    .toUriString();

            JusoResponse body = client.get().uri(uri).retrieve().body(JusoResponse.class);

            if (body == null || body.results() == null) return List.of();
            JusoResponse.Common common = body.results().common();
            if (common != null && common.errorCode() != null && !"0".equals(common.errorCode())) {
                log.warn("juso search error: {} {}", common.errorCode(), common.errorMessage());
                return List.of();
            }
            return body.results().juso() == null ? List.of() : body.results().juso();

        } catch (ResourceAccessException e) {
            // 연결·응답 타임아웃(spring.http.client.*) 또는 접속 불가 — 빈 결과와 구분되도록 에러로 응답
            throw new ApiException(HttpStatus.BAD_GATEWAY, "SEARCH_UNAVAILABLE", "주소검색 서버 응답 없음", e);
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "SEARCH_UNAVAILABLE", "주소검색 서버 오류", e);
        }
    }

    /** juso 주소 한 건 → 좌표 조회 후 결과 아이템. 좌표 실패 시 null. */
    private SearchResultItem toResultItem(JusoResponse.Juso j) {
        double[] coord = geocode(j.roadAddr());
        if (coord == null) return null;

        String title = hasText(j.bdNm()) ? j.bdNm() : j.roadAddr();
        return new SearchResultItem(
                "road:" + (j.bdMgtSn() == null ? "" : j.bdMgtSn()),
                title,
                hasText(j.bdNm()) ? "PLACE" : "ROAD",
                j.roadAddr(),
                j.jibunAddr(),
                coord[1],   // lat = y
                coord[0]    // lng = x
        );
    }

    /** vWorld 지오코더 — 도로명주소 → [lng, lat]. 실패 / NOT_FOUND 는 null. */
    private double[] geocode(String roadAddr) {
        if (!hasText(roadAddr)) return null;
        try {
            String uri = UriComponentsBuilder.fromUriString(vworld.geocodeUrl())
                    .queryParam("service", "address")
                    .queryParam("request", "getcoord")
                    .queryParam("version", "2.0")
                    .queryParam("crs",     "EPSG:4326")
                    .queryParam("type",    "road")
                    .queryParam("address", roadAddr)
                    .queryParam("format",  "json")
                    .queryParam("key",     vworld.key())
                    .build()
                    .toUriString();

            VWorldGeocodeResponse body = client.get().uri(uri).retrieve().body(VWorldGeocodeResponse.class);

            if (body == null || body.response() == null) return null;
            if (!"OK".equals(body.response().status())) return null;
            VWorldGeocodeResponse.Result result = body.response().result();
            if (result == null || result.point() == null) return null;

            return new double[]{
                    Double.parseDouble(result.point().x()),
                    Double.parseDouble(result.point().y())
            };
        } catch (Exception e) {
            log.warn("vWorld geocode failed: {}", roadAddr, e);
            return null;
        }
    }

    private boolean isInUlsan(SearchResultItem item) {
        String road   = item.roadAddress()   == null ? "" : item.roadAddress();
        String parcel = item.parcelAddress() == null ? "" : item.parcelAddress();
        return road.contains("울산") || parcel.contains("울산");
    }

    private static boolean hasText(String s) {
        return s != null && !s.isBlank();
    }
}
