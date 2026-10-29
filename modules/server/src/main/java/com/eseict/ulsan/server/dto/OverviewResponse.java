package com.eseict.ulsan.server.dto;

import java.time.Instant;
import java.util.List;

/** 메인 화면 전체. counts 는 13대 기준(간접 ○ 도 정상에 포함). lastSync = 「갱신 HH:MM:SS」. */
public record OverviewResponse(Counts counts, Instant lastSync, List<ServerCardResponse> cards) {

    public record Counts(int ok, int warn, int fail, int pending, int total) {}
}
