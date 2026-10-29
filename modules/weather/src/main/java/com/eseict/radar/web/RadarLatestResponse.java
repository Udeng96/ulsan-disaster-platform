package com.eseict.radar.web;

import java.time.OffsetDateTime;

/**
 * 대시보드 응답 — 가장 최근 레이더 영상 1건.
 * imageUrl 은 nginx 프록시 경로로 변환된 값.
 */
public record RadarLatestResponse(
        OffsetDateTime observedAtKst,
        String imageUrl,
        String radarType
) {}
