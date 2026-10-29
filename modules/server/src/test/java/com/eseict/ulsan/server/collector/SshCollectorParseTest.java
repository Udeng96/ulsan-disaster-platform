package com.eseict.ulsan.server.collector;

import com.eseict.ulsan.server.domain.ResourceKind;
import com.eseict.ulsan.server.domain.ResourceLayout;
import com.eseict.ulsan.server.domain.ResourceReading;
import com.eseict.ulsan.server.domain.Snapshot;
import org.junit.jupiter.api.Test;

import com.eseict.ulsan.server.config.MonitorProperties;
import com.eseict.ulsan.server.host.db.DbStatsReader;
import com.eseict.ulsan.server.host.live.HostLive;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** 실제 서버 출력 모양 그대로(12번 extlinksvr 09-08 실측 형식). */
class SshCollectorParseTest {

    static final String OUT = String.join("\n@@\n",
            "2937600.12 23400000.00",
            "0.00 0.01 0.00 1/312 54321",
            "8",
            "33566728192 1174405120 32392323072",
            "1%",
            "",
            "eno1 up\neno2 up\nbond0 up",
            "nginx\nsshd\njava");

    @Test void 출력_파싱() {
        Instant now = Instant.parse("2026-10-06T05:02:00Z");
        Snapshot s = SshCollector.parse(OUT, now, ResourceLayout.SERVER_NET);
        assertThat(s.uptimeDays()).isCloseTo(34.0, org.assertj.core.data.Offset.offset(0.01));
        assertThat(s.collectedAt()).isEqualTo(now);
        assertThat(s.resources()).extracting(ResourceReading::kind)
                .containsExactly(ResourceKind.SYSTEM_DISK, ResourceKind.MEMORY, ResourceKind.CPU, ResourceKind.NETWORK);
        assertThat(s.resources().get(0).pct()).isEqualTo(1.0);
        assertThat(s.resources().get(1).pct()).isEqualTo(3.5);
        assertThat(s.resources().get(2).detail()).isEqualTo("0/8코어");   // 5분 부하 0.01 → 0
        assertThat(s.nicLinks()).isEqualTo("eno1 UP · eno2 UP · bond0 UP");
        assertThat(s.services()).isEqualTo("nginx · sshd · java 가동");
        assertThat(s.source()).isEqualTo("SSH");

        SshCollector.Parsed p = SshCollector.parseOutput(OUT);
        assertThat(p.metrics().load5()).isEqualTo(0.01);
        assertThat(p.metrics().threads()).isEqualTo(8);
        assertThat(p.metrics().diskDataPct()).isNull();
    }

    @Test void 일부_깨져도_나머지는_산다() {
        SshCollector.Parsed p = SshCollector.parseOutput("garbage@@@@x@@@@@@");
        assertThat(p.uptimeDays()).isNull();
        assertThat(p.metrics().threads()).isNull();
        assertThat(p.metrics().memPct()).isNull();
    }

    static final MonitorProperties.Ssh.Target NINE = new MonitorProperties.Ssh.Target("intlinksvr", "192.0.2.179", 10622, null,
            List.of(new MonitorProperties.Ssh.MainService("nginx", "nginx: master", null),
                    new MonitorProperties.Ssh.MainService("java", "java -jar relay", null)));

    /** 3번 모양: sda 에 파티션 2개(/boot · lvm 루트), sdb 는 통째로 /data, sr0 은 디스크 아님. */
    static final String DISKS = String.join("\n",
            "NAME=\"sda\" TYPE=\"disk\" SIZE=\"480103981056\" ROTA=\"0\" FSUSED=\"\" FSSIZE=\"\" PKNAME=\"\" MODEL=\"SAMSUNG MZ7L3480\"",
            "NAME=\"sda1\" TYPE=\"part\" SIZE=\"1073741824\" ROTA=\"0\" FSUSED=\"200000000\" FSSIZE=\"1000000000\" PKNAME=\"sda\" MODEL=\"\"",
            "NAME=\"sda2\" TYPE=\"part\" SIZE=\"479000000000\" ROTA=\"0\" FSUSED=\"\" FSSIZE=\"\" PKNAME=\"sda\" MODEL=\"\"",
            "NAME=\"rl-root\" TYPE=\"lvm\" SIZE=\"470000000000\" ROTA=\"0\" FSUSED=\"7400000000\" FSSIZE=\"469000000000\" PKNAME=\"sda2\" MODEL=\"\"",
            "NAME=\"sdb\" TYPE=\"disk\" SIZE=\"4000787030016\" ROTA=\"1\" FSUSED=\"1200000000000\" FSSIZE=\"3900000000000\" PKNAME=\"\" MODEL=\"ST4000NM\"",
            "NAME=\"sr0\" TYPE=\"rom\" SIZE=\"1073741312\" ROTA=\"1\" FSUSED=\"\" FSSIZE=\"\" PKNAME=\"\" MODEL=\"DVD\"");

    static final String NICS = "eno1 up 1000 5000 7000 bond0\neno2 up 1000 0 0 bond0\neno3 down -1 0 0 -\nens1f0 up 10000 9 9 -";

    @Test void 디스크_파티션_사용량은_디스크에_더한다() {
        List<HostLive.Disk> d = SshCollector.disks(DISKS);
        assertThat(d).extracting(HostLive.Disk::name).containsExactly("sda", "sdb");
        assertThat(d.get(0)).isEqualTo(new HostLive.Disk("sda", 480103981056L, true, "SAMSUNG MZ7L3480", 7600000000L, 470000000000L));
        assertThat(d.get(1).ssd()).isFalse();
        assertThat(d.get(1).fsUsed()).isEqualTo(1200000000000L);
    }

    @Test void 옛_lsblk_는_사용량_없이_크기만() {
        List<HostLive.Disk> d = SshCollector.disks("NAME=\"vda\" TYPE=\"disk\" SIZE=\"107374182400\" ROTA=\"1\" PKNAME=\"\" MODEL=\"\"");
        assertThat(d).containsExactly(new HostLive.Disk("vda", 107374182400L, false, null, null, null));
    }

    @Test void 랜카드_속도_모름_묶음() {
        List<HostLive.Nic> n = SshCollector.nics(NICS);
        assertThat(n).containsExactly(new HostLive.Nic("eno1", true, 1000, 5000, 7000, "bond0"),
                new HostLive.Nic("eno2", true, 1000, 0, 0, "bond0"),
                new HostLive.Nic("eno3", false, null, 0, 0, null),
                new HostLive.Nic("ens1f0", true, 10000, 9, 9, null));
        assertThat(SshCollector.nics("garbage\n")).isEmpty();
    }

    /** 9번 모양: 기관에서 들어온 연결 · 우리 수집 SSH(10622) · 같은 서버 안 · IPv6 로 적힌 IPv4. */
    static final String LIVE = OUT + "\n@@\n" + String.join("\n",
            "192.0.2.179:80 192.0.2.11:51234",
            "192.0.2.179:80 192.0.2.11:51240",
            "192.0.2.179:8099 192.0.2.177:40000",
            "192.0.2.179:10622 192.0.2.152:55555",
            "127.0.0.1:5432 127.0.0.1:60000",
            "[::ffff:192.0.2.179]:9501 [::ffff:192.0.2.14]:33333")
            + "\n@@\n" + "eno1 1000 2000\nbond0 5000 7000"
            + "\n@@\n" + DISKS
            + "\n@@\n" + NICS
            + "\n@@\n" + "  86400"
            + "\n@@\n";

    @Test void 연결_상대_주요_서비스_받은_보낸_누적() {
        Instant now = Instant.parse("2026-10-16T01:00:00Z");
        HostLive h = SshCollector.parseLive(LIVE, now, NINE);
        assertThat(h.peers()).containsExactly(new DbStatsReader.Peer("192.0.2.11", 2), new DbStatsReader.Peer("192.0.2.177", 1),
                new DbStatsReader.Peer("192.0.2.14", 1));
        assertThat(h.services()).containsExactly(new HostLive.ServiceState("nginx", true, now.minusSeconds(86400)),
                new HostLive.ServiceState("java", false, null));
        assertThat(h.rxBytes()).isEqualTo(6000L);
        assertThat(h.txBytes()).isEqualTo(9000L);
        assertThat(h.disks()).hasSize(2);
        assertThat(h.nics()).hasSize(4);
        // 앞 8칸 파싱은 그대로
        assertThat(SshCollector.parse(LIVE, now, ResourceLayout.SERVER_NET).services()).isEqualTo("nginx · sshd · java 가동");
    }

    @Test void 예전_출력처럼_칸이_모자라도_빈_값() {
        HostLive h = SshCollector.parseLive(OUT, Instant.now(), NINE);
        assertThat(h.peers()).isEmpty();
        assertThat(h.rxBytes()).isNull();
        assertThat(h.disks()).isEmpty();
        assertThat(h.nics()).isEmpty();
        assertThat(h.services()).extracting(HostLive.ServiceState::running).containsExactly(false, false);
    }

    static final MonitorProperties.Ssh.Target FOUR = new MonitorProperties.Ssh.Target("allcontsvr", "192.0.2.93", 10222, null,
            List.of(new MonitorProperties.Ssh.MainService("OMS", null, "oms.service"),
                    new MonitorProperties.Ssh.MainService("GEOMEX", null, "geomex.service, tomcat.service"),
                    new MonitorProperties.Ssh.MainService("redis", null, "redis.service")));

    @Test void 등록된_서비스_이름으로_확인() {
        assertThat(SshCollector.command(FOUR))
                .contains("for u in 'oms.service'; do systemctl is-active -q \"$u\" || continue; echo active;")
                .contains("for u in 'geomex.service' 'tomcat.service'; do");
        Instant now = Instant.parse("2026-10-16T01:00:00Z");
        // oms = 켜짐 + 하루 전부터, GEOMEX = 켜짐(주 프로세스 모름), redis = 꺼짐
        String out = String.join("\n@@\n", OUT, "", "", "", "", "active\n  86400", "active", "");
        HostLive h = SshCollector.parseLive(out, now, FOUR);
        assertThat(h.services()).containsExactly(new HostLive.ServiceState("OMS", true, now.minusSeconds(86400)),
                new HostLive.ServiceState("GEOMEX", true, null), new HostLive.ServiceState("redis", false, null));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> SshCollector.unit("oms'; rm -rf /"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test void 서비스_찾기는_자기_명령을_안_잡게_첫_글자를_묶는다() {
        assertThat(SshCollector.selfSafe("nginx: master")).isEqualTo("[n]ginx: master");
        assertThat(SshCollector.command(NINE)).contains("pgrep -o -f '[n]ginx: master'").contains("pgrep -o -f '[j]ava -jar relay'");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> SshCollector.selfSafe("x'; rm -rf /"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
