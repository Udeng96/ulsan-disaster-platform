package com.eseict.ulsan.server.host.part;

import com.eseict.ulsan.server.domain.Verdict;
import com.eseict.ulsan.server.host.live.HostLive;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HostPartServiceTest {

    static final String SHEET = "수기항목 엑셀 10-16";
    static final List<HostPartService.Manual> ROWS = List.of(
            new HostPartService.Manual("FRONT", "전원 버튼", "전원 켜기·끄기", null, null, SHEET),
            new HostPartService.Manual("REAR", "PSU1", "UPS 전원", null, null, SHEET),
            new HostPartService.Manual("REAR", "LAN1", "관제센터 백본", null, "nic:eno1", SHEET),
            new HostPartService.Manual("REAR", "BMC", "원격관리", "사용 안 함", null, SHEET));

    @Test void 읽은_값이_없으면_사람_줄만() {
        HostParts p = HostPartService.build("dbsvr", ROWS, null);
        assertThat(p.measuredAt()).isNull();
        assertThat(p.front()).extracting(HostParts.Row::item).containsExactly("전원 버튼");
        assertThat(p.rear()).extracting(HostParts.Row::item).containsExactly("PSU1", "LAN1", "BMC");
        assertThat(p.rear().get(1).state()).isNull();
        assertThat(p.rear().get(2).state()).isEqualTo("사용 안 함");
        assertThat(p.rear().get(2).verdict()).isNull();
    }

    @Test void 디스크는_전면_랜카드는_후면에_붙고_사람_줄과_짝지으면_거기에() {
        Instant at = Instant.parse("2026-10-16T01:00:00Z");
        HostLive h = new HostLive(at, null, null, null, null,
                List.of(new HostLive.Disk("sda", 480103981056L, true, "SAMSUNG", 7_600_000_000L, 470_000_000_000L),
                        new HostLive.Disk("sdb", 4_000_787_030_016L, false, null, null, null)),
                List.of(new HostLive.Nic("eno1", true, 1000, 30_200_000_000L, 36_100_000_000L, "bond0"),
                        new HostLive.Nic("eno3", false, null, 0, 0, null)));
        HostParts p = HostPartService.build("dbsvr", ROWS, h);
        assertThat(p.measuredAt()).isEqualTo(at);

        assertThat(p.front()).extracting(HostParts.Row::item).containsExactly("전원 버튼", "sda", "sdb");
        assertThat(p.front().get(1)).isEqualTo(new HostParts.Row("sda", "SSD 480.1GB · SAMSUNG", "장착", Verdict.OK,
                "7.6GB / 470.0GB", HostPartService.MEASURED));
        assertThat(p.front().get(2).content()).isEqualTo("HDD 4.0TB");
        assertThat(p.front().get(2).usage()).isEqualTo("— / 4.0TB");

        // eno1 은 사람 줄 LAN1 에 붙음(연결 상대는 사람 값 유지), eno3 는 새 줄
        assertThat(p.rear()).extracting(HostParts.Row::item).containsExactly("PSU1", "LAN1", "BMC", "eno3");
        assertThat(p.rear().get(1)).isEqualTo(new HostParts.Row("LAN1", "관제센터 백본", "연결됨", Verdict.OK,
                "받음 30.2GB · 보냄 36.1GB", SHEET));
        assertThat(p.rear().get(3).state()).isEqualTo("연결 안 됨");
        assertThat(p.rear().get(3).verdict()).isNull();
        assertThat(p.rear().get(3).content()).isNull();
    }
}
