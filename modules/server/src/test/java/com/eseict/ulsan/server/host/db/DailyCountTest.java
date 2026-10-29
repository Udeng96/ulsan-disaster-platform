package com.eseict.ulsan.server.host.db;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DailyCountTest {

    @Test
    void 그날_처음_읽은_값부터_센다() {
        DailyCount c = DailyCount.first(1_000).next(1_250).next(1_300);
        assertThat(c.today()).isEqualTo(300);
    }

    @Test
    void DB_재시작으로_누적이_줄면_그때까지_센_만큼_넘기고_0부터() {
        DailyCount c = DailyCount.first(1_000).next(1_200);   // 오늘 200
        c = c.next(50);                                        // 재시작 뒤 50
        assertThat(c.today()).isEqualTo(250);
        assertThat(c.next(80).today()).isEqualTo(280);
    }
}
