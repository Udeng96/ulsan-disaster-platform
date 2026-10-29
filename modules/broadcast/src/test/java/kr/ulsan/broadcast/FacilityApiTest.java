package kr.ulsan.broadcast;

import kr.ulsan.broadcast.voice.template.MessageTemplate;
import kr.ulsan.broadcast.voice.template.MessageTemplateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** gis 에서 넘겨받은 목록 API: 단말·전광판 조회, 문구 목록·추가·수정·삭제. */
@SpringBootTest
@AutoConfigureMockMvc
class FacilityApiTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    MessageTemplateRepository templates;
    @Value("${spring.jpa.properties.hibernate.default_schema}")
    String schema;

    @BeforeEach
    void setup() {
        FacilityFixture.reset(jdbc, schema);
        templates.deleteAll();
    }

    @Test
    void terminalsWithRegionName() throws Exception {
        mvc.perform(get("/api/broadcast/terminals"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].terminalCode").value("SGB129"))
                .andExpect(jsonPath("$[0].name").value("가상시설0003"))
                .andExpect(jsonPath("$[0].layerCode").value("BROADCAST"))
                .andExpect(jsonPath("$[0].commType").value("BROADCAST_CDMA"))
                .andExpect(jsonPath("$[0].phone").value("012-3332-2330"))
                .andExpect(jsonPath("$[0].lat").value(0.0))
                .andExpect(jsonPath("$[0].installedAt").value("2021-07-27"))
                .andExpect(jsonPath("$[0].groupType").value("경로당"))
                .andExpect(jsonPath("$[0].region").value("달동"))
                .andExpect(jsonPath("$[1].region").doesNotExist());   // 행정동 없음 → 응답에서 빠짐
    }

    @Test
    void signboardsWithRegionName() throws Exception {
        mvc.perform(get("/api/broadcast/signboards"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$[1].id").value(2))
                .andExpect(jsonPath("$[1].name").value("가상시설0433"))
                .andExpect(jsonPath("$[1].layerCode").value("SIGNBOARD"))
                .andExpect(jsonPath("$[1].host").value("가상시설0208"))
                .andExpect(jsonPath("$[1].region").value("삼호동"))
                .andExpect(jsonPath("$[2].host").doesNotExist());
    }

    @Test
    void templateCreateUpdateDelete() throws Exception {
        mvc.perform(post("/api/broadcast/templates").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"한파주의보\",\"content\":\"외출을 자제하세요\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("한파주의보"));
        MessageTemplate saved = templates.findAll().get(0);
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isEqualTo(saved.getCreatedAt());

        mvc.perform(post("/api/broadcast/templates").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"폭염주의보\",\"content\":\"물을 드세요\"}")).andExpect(status().isCreated());
        mvc.perform(get("/api/broadcast/templates"))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("한파주의보"))   // id 순
                .andExpect(jsonPath("$[1].title").value("폭염주의보"));

        Thread.sleep(5);
        mvc.perform(put("/api/broadcast/templates/" + saved.getId()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"한파경보\",\"content\":\"동파에 유의하세요\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(saved.getId()))
                .andExpect(jsonPath("$.content").value("동파에 유의하세요"));
        MessageTemplate updated = templates.findById(saved.getId()).orElseThrow();
        assertThat(updated.getTitle()).isEqualTo("한파경보");
        assertThat(updated.getUpdatedAt()).isAfter(updated.getCreatedAt());

        mvc.perform(delete("/api/broadcast/templates/" + saved.getId())).andExpect(status().isNoContent());
        assertThat(templates.findById(saved.getId())).isEmpty();
    }

    @Test
    void templateNotFoundAndValidation() throws Exception {
        String ok = "{\"title\":\"t\",\"content\":\"c\"}";
        mvc.perform(put("/api/broadcast/templates/999").contentType(MediaType.APPLICATION_JSON).content(ok))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message[0]").value("문구가 없습니다: 999"));
        mvc.perform(delete("/api/broadcast/templates/999")).andExpect(status().isNotFound());

        mvc.perform(post("/api/broadcast/templates").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\" \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message.length()").value(2));
        mvc.perform(post("/api/broadcast/templates").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + "가".repeat(201) + "\",\"content\":\"c\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message[0]").value("title: 200자 이하여야 합니다"));
        assertThat(templates.count()).isZero();
    }
}
