package kr.ulsan.broadcast.commlog;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/** 통신 로그 1개월 보관 확인. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class CommLogServiceTest {

    @Autowired
    CommLogService service;
    @Autowired
    CommLogRepository repository;

    private CommLog log(LocalDateTime createdAt) {
        return new CommLog("VOICE", "OUT", "VENDOR", "mock", "EXP CAST ID RESULT",
                null, "{}", true, null, 0, null, null, createdAt);
    }

    @Test
    void purgeDeletesLogsOlderThanOneMonth() {
        repository.deleteAll();
        LocalDateTime now = LocalDateTime.now();
        repository.save(log(now.minusMonths(1).minusDays(1)));   // 지움
        repository.save(log(now.minusDays(29)));                 // 남김

        service.purgeOldLogs();

        assertThat(repository.findAll()).hasSize(1);
        assertThat(repository.findAll().get(0).getCreatedAt()).isAfter(now.minusMonths(1));
    }
}
