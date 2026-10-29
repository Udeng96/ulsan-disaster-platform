package com.eseict.ulsan.server.controller;

import com.eseict.ulsan.server.domain.Verdict;
import com.eseict.ulsan.server.dto.OverviewResponse;
import com.eseict.ulsan.server.dto.ServerCardResponse;
import com.eseict.ulsan.server.service.OverviewService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 화면이 받는 JSON 모양을 고정한다. 필드 이름이 바뀌면 여기서 먼저 깨진다. */
@WebMvcTest(OverviewController.class)
class OverviewControllerTest {

    @Autowired MockMvc mvc;
    @MockitoBean OverviewService overview;

    @Test void 메인_카드_JSON() throws Exception {
        ServerCardResponse card = new ServerCardResponse(3, "dbsvr", "(저장) 데이터베이스", Verdict.WARN, "주의", "#F2D230",
                true, "가동 50일 · 응답 정상", "디스크 · 마지막 저장", "2%", "저장 기록 대기", Verdict.WARN);
        given(overview.overview()).willReturn(new OverviewResponse(new OverviewResponse.Counts(10, 3, 0, 0, 13),
                Instant.parse("2026-10-06T05:02:35Z"), List.of(card)));

        mvc.perform(get("/api/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.counts.ok").value(10))
                .andExpect(jsonPath("$.counts.total").value(13))
                .andExpect(jsonPath("$.cards[0].host").value("dbsvr"))
                .andExpect(jsonPath("$.cards[0].verdict").value("WARN"))
                .andExpect(jsonPath("$.cards[0].keyValue").value("2%"))
                .andExpect(jsonPath("$.cards[0].directDot").value(true));
    }
}
