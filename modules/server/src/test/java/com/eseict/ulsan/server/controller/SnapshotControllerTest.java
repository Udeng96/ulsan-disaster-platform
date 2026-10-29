package com.eseict.ulsan.server.controller;

import com.eseict.ulsan.server.service.SnapshotService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SnapshotController.class)
class SnapshotControllerTest {

    @Autowired MockMvc mvc;
    @MockitoBean SnapshotService snapshots;

    @Test void host_없으면_400() throws Exception {
        mvc.perform(post("/api/snapshots").contentType(MediaType.APPLICATION_JSON).content("{\"memPct\": 3}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test void 비율_100_초과_400() throws Exception {
        mvc.perform(post("/api/snapshots").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"host\":\"dbsvr\",\"memPct\": 101}"))
                .andExpect(status().isBadRequest());
    }
}
