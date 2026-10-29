package com.eseict.ulsan.owl.collect;

import com.eseict.ulsan.owl.collect.dto.CollectedMessage;
import com.eseict.ulsan.owl.ingest.dto.OwlRawMessage;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.locationtech.proj4j.CRSFactory;
import org.locationtech.proj4j.CoordinateReferenceSystem;
import org.locationtech.proj4j.CoordinateTransform;
import org.locationtech.proj4j.CoordinateTransformFactory;
import org.locationtech.proj4j.ProjCoordinate;

/**
 * 부엉이 원본(OwlRawMessage) → 응답 표준형(CollectedMessage) 매핑.
 *
 * <p>매핑 규칙: 일시 {@code yyyyMMdd+HHmmss}→LocalDateTime, 주소 fallback(행정동전체→법정동전체),
 * msgSprtr→{@link MsgType}, 좌표 EPSG:5179→WGS84 변환,
 * 빈 문자열→null.
 */
public final class OwlMessageMapper {

    private static final DateTimeFormatter DTM = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    /**
     * EPSG:5179 (Korea 2000 / Unified CS, UTM-K). 부엉이 좌표가 이 투영좌표로 온다.
     * proj4j 기본 EPSG 목록에 없을 수 있어 파라미터로 직접 정의한다.
     */
    private static final String UTM_K =
            "+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 "
                    + "+ellps=GRS80 +units=m +no_defs";

    /** WGS84 경위도. proj4j 코어에는 EPSG 정의 파일이 없어 이름 대신 파라미터로 만든다. */
    private static final String WGS84 = "+proj=longlat +datum=WGS84 +no_defs";

    private static final CoordinateTransform TO_WGS84 = newTransform();

    private OwlMessageMapper() {
    }

    public static CollectedMessage toCollected(OwlRawMessage raw) {
        BigDecimal[] lngLat = toWgs84(raw.dolcXcord(), raw.dolcYcord());
        return new CollectedMessage(
                raw.msgId(),
                raw.msgSn(),
                parseDtm(raw.sndDe(), raw.sndHms()),
                MsgType.fromCode(raw.msgSprtr()),
                trimToNull(raw.dstrTyCd()),
                trimToNull(raw.dstrTyNm()),
                trimToNull(raw.sj()),
                parseDtm(raw.dstrOccrDe(), raw.dstrOccrHms()),
                trimToNull(raw.dstrEndNm()),
                trimToNull(raw.dolcNm()),
                normalizeAddr(firstNonBlank(raw.dolcFllHdongAdres(), raw.dolcFllBdongAdres())),
                normalizeAddr(trimToNull(raw.dolcFllRnAdres())),
                lngLat[1],
                lngLat[0],
                toReportDetail(raw.sittnSumry())
        );
    }

    /**
     * 상황개요에서 <b>신고내역</b>만 뽑는다. 원본은 URL 인코딩된 HTML 이고 신고일시·발생위치·
     * 진행상황 등은 다른 필드에 이미 있으므로, 관제에 실제로 필요한 신고내역만 남긴다.
     * (예: {@code "○ 신고내역 : 금탑아파트 가동 206호 / 머리부상"} → {@code "금탑아파트 가동 206호 / 머리부상"})
     */
    private static String toReportDetail(String encoded) {
        String text = toPlainText(encoded);
        if (text == null) {
            return null;
        }
        for (String line : text.split("\n")) {
            if (line.contains("신고내역")) {
                int colon = line.indexOf(':');
                return colon >= 0 ? trimToNull(line.substring(colon + 1)) : trimToNull(line);
            }
        }
        return null;
    }

    /**
     * URL 인코딩된 HTML → 평문. 디코딩 → 줄바꿈 태그 치환 → 태그 제거 → 엔티티 복원 →
     * 빈 줄/구분선 정리.
     */
    private static String toPlainText(String encoded) {
        String s = trimToNull(encoded);
        if (s == null) {
            return null;
        }
        try {
            s = URLDecoder.decode(s, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            // 인코딩이 깨진 경우 원본 그대로 두고 태그 제거만 진행
        }
        s = s.replaceAll("(?i)<br\\s*/?>", "\n")
                .replaceAll("(?i)</(p|div)>", "\n")
                .replaceAll("<[^>]+>", "");
        s = s.replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"");
        StringBuilder sb = new StringBuilder();
        for (String line : s.split("\n")) {
            String t = line.trim();
            if (t.isEmpty() || t.chars().allMatch(c -> c == '=')) {
                continue;   // 빈 줄과 "=====" 구분선은 버린다
            }
            if (sb.length() > 0) {
                sb.append('\n');
            }
            sb.append(t);
        }
        return sb.length() == 0 ? null : sb.toString();
    }

    /** {@code yyyyMMdd} + {@code HHmmss} → LocalDateTime. 일자 없으면 null, 시분초 없으면 000000. */
    private static LocalDateTime parseDtm(String de, String hms) {
        String d = trimToNull(de);
        if (d == null) {
            return null;
        }
        String t = trimToNull(hms);
        if (t == null) {
            t = "000000";
        }
        while (t.length() < 6) {
            t = t + "0";
        }
        try {
            return LocalDateTime.parse(d + t.substring(0, 6), DTM);
        } catch (RuntimeException e) {
            return null;
        }
    }

    /**
     * 좌표 → {경도, 위도}. 부엉이는 EPSG:5179 투영좌표로 주지만 발신 시스템에 따라 위경도가
     * 그대로 오는 경우도 있어(좌표비교 자료), 값 범위로 판별해 필요할 때만 변환한다.
     */
    private static BigDecimal[] toWgs84(String x, String y) {
        Double px = parseDouble(x);
        Double py = parseDouble(y);
        if (px == null || py == null) {
            return new BigDecimal[]{null, null};
        }
        if (isLonLat(px, py)) {
            return new BigDecimal[]{scale6(px), scale6(py)};
        }
        try {
            ProjCoordinate out = new ProjCoordinate();
            synchronized (TO_WGS84) {   // proj4j 변환 객체는 thread-safe 하지 않다
                TO_WGS84.transform(new ProjCoordinate(px, py), out);
            }
            return new BigDecimal[]{scale6(out.x), scale6(out.y)};
        } catch (RuntimeException e) {
            return new BigDecimal[]{null, null};
        }
    }

    /** 이미 WGS84 십진도인지 (대한민국 범위). 투영좌표는 수십만~수백만이라 명확히 갈린다. */
    private static boolean isLonLat(double x, double y) {
        return x >= 124.0 && x <= 132.0 && y >= 33.0 && y <= 39.0;
    }

    private static CoordinateTransform newTransform() {
        CRSFactory crsFactory = new CRSFactory();
        CoordinateReferenceSystem from = crsFactory.createFromParameters("EPSG:5179", UTM_K);
        CoordinateReferenceSystem to = crsFactory.createFromParameters("WGS84", WGS84);
        return new CoordinateTransformFactory().createTransform(from, to);
    }

    private static Double parseDouble(String s) {
        String v = trimToNull(s);
        if (v == null) {
            return null;
        }
        try {
            return Double.valueOf(v);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static BigDecimal scale6(double v) {
        return BigDecimal.valueOf(v).setScale(6, RoundingMode.HALF_UP);
    }

    /**
     * 주소 정리. 원본이 [지번] + [상세주소] 를 이어붙이는데 발신자가 상세주소에 지번을 다시
     * 넣는 경우가 많아 {@code "... 가상시설0480 1603-10 1603-10"} 처럼 마지막 토큰이 중복된다.
     * 공백을 정리하고 연속 중복 토큰 하나를 제거한다.
     */
    private static String normalizeAddr(String addr) {
        if (addr == null) {
            return null;
        }
        String[] tokens = addr.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        String prev = null;
        for (String token : tokens) {
            if (!token.equals(prev)) {
                if (sb.length() > 0) {
                    sb.append(' ');
                }
                sb.append(token);
            }
            prev = token;
        }
        return sb.length() == 0 ? null : sb.toString();
    }

    /** 앞의 값이 비어 있으면 뒤의 값. 둘 다 비면 null. */
    private static String firstNonBlank(String first, String second) {
        String v = trimToNull(first);
        return v != null ? v : trimToNull(second);
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
