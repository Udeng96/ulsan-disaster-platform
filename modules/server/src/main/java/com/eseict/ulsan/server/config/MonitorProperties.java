package com.eseict.ulsan.server.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.List;

/**
 * monitor.* 설정 (서버 13대 판정·SSH 수집). 방화벽·스위치 SNMP 는 firewall.* / switch.* 가 따로 맡는다. 전부 외부 yml 에서 바꾼다. 비밀값(SSH 개인키)은 여기 두지 않고 OS 파일 권한으로 보호한다.
 */
@ConfigurationProperties(prefix = "monitor")
public record MonitorProperties(Collector collector, Retention retention) {

    public MonitorProperties {
        if (retention == null) retention = new Retention(null, null, null);
    }

    public record Collector(
            /** 수집 주기. 오래됨 판정(3배 주의 · 10배 실측 대기)의 기준. */
            Duration interval,
            /** snapshot | live */
            String mode,
            SnapshotFile snapshot,
            Ssh ssh) {
    }

    /** 시트 스냅샷 재생. replay=true 면 수집 시각을 지금으로 찍어 화면이 「실측 대기」로 떨어지지 않게 한다(measuredAt 은 원래 시각 유지). */
    public record SnapshotFile(String path, boolean replay) {}

    /** 3~10·12번. 키 로그인만. 명령은 읽기 전용 고정 목록(SshCollector.COMMAND + 주요 서비스 확인). */
    public record Ssh(boolean enabled, String user, String privateKeyPath, Duration timeout, List<Target> targets) {
        /**
         * via      : 바로 못 들어가는 서버는 거쳐 갈 서버의 host (12번 → intlinksvr, 사용자 10-16 「106번에서만 SSH」). 비우면 바로 접속.
         * services : ⑤ 최근 활동에 보일 주요 서비스. name = 화면 이름, 찾는 법은 둘 중 하나:
         *            unit = 서버에 등록된 서비스 이름(systemctl, 예: oms.service · 사용자 10-16) / process = 실행 명령에서 찾을 글자(pgrep -f).
         *            비우면 「주요 서비스 미지정」.
         */
        public record Target(String host, String address, int port, String via, List<MainService> services) {
            public Target {
                services = services == null ? List.of() : List.copyOf(services);
            }
        }

        public record MainService(String name, String process, String unit) {}
    }

    /**
     * 오래된 기록 정리 (매일 03:10). 바꾸려면 yml 만 고친다.
     * raw       = 방화벽·스위치 10초 기록 (fw_status · fw_interface · sw_status · sw_interface). 기본 30일
     * fwLog     = 방화벽 Syslog (fw_log). 기본 30일 — 차단 평소값이 7일치를 쓰므로 7일보다 짧게 하지 않는다
     * snapshots = 판정용 측정 기록 (server_snapshots + snapshot_resources). 기본 90일
     */
    public record Retention(Duration raw, Duration fwLog, Duration snapshots) {
        public Retention {
            if (raw == null) raw = Duration.ofDays(30);
            if (fwLog == null) fwLog = Duration.ofDays(30);
            if (snapshots == null) snapshots = Duration.ofDays(90);
        }
    }
}
