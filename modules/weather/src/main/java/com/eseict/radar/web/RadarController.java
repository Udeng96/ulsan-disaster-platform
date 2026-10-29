package com.eseict.radar.web;

import com.eseict.radar.config.RadarProperties;
import com.eseict.radar.domain.RadarImage;
import com.eseict.radar.repository.RadarImageRepository;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/api/radar")
public class RadarController {

    private final RadarImageRepository repository;
    private final RadarProperties properties;

    public RadarController(RadarImageRepository repository, RadarProperties properties) {
        this.repository = repository;
        this.properties = properties;
    }

    /**
     * 가장 최근 레이더 영상 1건.
     * 응답에는 nginx 프록시 경로로 변환된 imageUrl 을 담는다.
     *
     * Cache-Control: 클라이언트가 30초 이상 캐싱 안 하도록 (프론트는 1분 주기 폴링 권장).
     * OffsetDateTime KST 표기는 spring.jackson.time-zone=Asia/Seoul 로 전역 처리.
     */
    @GetMapping(value = "/latest", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<RadarLatestResponse> latest() {
        List<RadarImage> rows = repository.findRecentByType(properties.dataType(), 1);
        if (rows.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        RadarImage row = rows.get(0);
        RadarLatestResponse body = new RadarLatestResponse(
                row.getObservedAtKst(),
                toProxyUrl(row.getSourceUrl()),
                row.getRadarType()
        );
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofSeconds(30)))
                .body(body);
    }

    /**
     * 원본 KMA URL의 도메인 부분을 nginx 프록시 prefix로 치환.
     *   http://www.kma.go.kr/...path...  →  /kma-radar/...path...
     * proxyPrefix 미설정 또는 파싱 실패 시 원본 그대로 반환.
     */
    private String toProxyUrl(String original) {
        if (original == null || original.isBlank()) return original;
        String prefix = properties.proxyPrefix();
        if (prefix == null || prefix.isBlank()) return original;
        try {
            URI uri = URI.create(original);
            String path = uri.getRawPath();
            if (path == null || path.isEmpty()) return original;
            String trimmedPrefix = prefix.endsWith("/")
                    ? prefix.substring(0, prefix.length() - 1)
                    : prefix;
            return trimmedPrefix + path;
        } catch (IllegalArgumentException e) {
            return original;
        }
    }
}
