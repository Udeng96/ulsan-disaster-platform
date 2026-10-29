package com.eseict.ulsan.server.host.live;

import com.eseict.ulsan.server.host.db.DbStatsReader;
import java.time.Instant;
import java.util.List;

/**
 * SSH 로 한 번 읽은 서버의 ④ ⑤ ⑥ 재료 (4~10·12번 공통 규칙, 사용자 2026-10-16).
 * peers    : 지금 붙어 있는 상대 IP 별 연결 수 (ss). 같은 서버 안·SSH 접속(우리 수집 포함)은 뺌
 * services : 주요 서비스 실행 여부 + 언제부터 (설정한 것만)
 * rxBytes · txBytes : 네트워크 카드가 켜진 뒤 받은·보낸 누적 바이트 (/sys/class/net). 읽지 못하면 null
 * disks · nics : 전면·후면 표에 붙일 디스크(lsblk)·실제 랜카드(/sys/class/net 에서 device 있는 것)
 */
public record HostLive(Instant at, List<DbStatsReader.Peer> peers, List<ServiceState> services, Long rxBytes, Long txBytes,
                       List<Disk> disks, List<Nic> nics) {

    public HostLive {
        peers = peers == null ? List.of() : List.copyOf(peers);
        services = services == null ? List.of() : List.copyOf(services);
        disks = disks == null ? List.of() : List.copyOf(disks);
        nics = nics == null ? List.of() : List.copyOf(nics);
    }

    public HostLive(Instant at, List<DbStatsReader.Peer> peers, List<ServiceState> services, Long rxBytes, Long txBytes) {
        this(at, peers, services, rxBytes, txBytes, null, null);
    }

    /** 디스크 한 개. ssd = 회전 안 함(ROTA 0). fsUsed·fsSize = 그 디스크 위 파일시스템 합(미러면 양쪽 같음). 모르면 null. */
    public record Disk(String name, long sizeBytes, Boolean ssd, String model, Long fsUsed, Long fsSize) {}

    /** 랜카드 한 개. speedMbps 모르면 null, master = 묶음(bond0)에 들어 있으면 그 이름. rx·tx = 켜진 뒤 누적 바이트. */
    public record Nic(String name, boolean up, Integer speedMbps, long rxBytes, long txBytes, String master) {}

    /** since = 프로세스가 시작한 시각 (실행 중일 때만). */
    public record ServiceState(String name, boolean running, Instant since) {}
}
