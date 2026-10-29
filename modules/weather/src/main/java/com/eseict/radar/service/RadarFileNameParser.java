package com.eseict.radar.service;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 레이더 영상 파일명에서 관측시각 추출.
 *   예: RDR_CMP_WRC_202605281330.png   →  2026-05-28 13:30 (KST!)
 *   ⚠️ 위성과 달리 레이더 파일명 시각은 KST 기준이다.
 */
public final class RadarFileNameParser {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final Pattern TIMESTAMP_PATTERN = Pattern.compile("(\\d{12})(?:\\.[a-zA-Z]+)?$");
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyyMMddHHmm");

    private RadarFileNameParser() {
    }

    /** KST 기준 OffsetDateTime 반환. UTC가 필요하면 호출자가 atZoneSameInstant 변환. */
    public static Optional<OffsetDateTime> parseObservedKst(String url) {
        int slash = url.lastIndexOf('/');
        String fileName = slash < 0 ? url : url.substring(slash + 1);
        Matcher m = TIMESTAMP_PATTERN.matcher(fileName);
        if (!m.find()) return Optional.empty();
        try {
            LocalDateTime ldt = LocalDateTime.parse(m.group(1), FMT);
            return Optional.of(ldt.atZone(KST).toOffsetDateTime());
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
