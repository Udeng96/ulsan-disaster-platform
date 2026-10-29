package com.eseict.ulsan.server.domain;

import java.util.List;

/**
 * 장비별 자원 4칸 구성. servers.resource_layout 에 이름을 적는다.
 * 칸 순서: 1 위왼쪽 · 2 위오른쪽 · 3 아래왼쪽 · 4 아래오른쪽.
 */
public enum ResourceLayout {
    /** 데이터디스크가 있는 서버 (3 DB · 7 GIS) */
    SERVER_DATA(ResourceKind.SYSTEM_DISK, ResourceKind.MEMORY, ResourceKind.CPU, ResourceKind.DATA_DISK),
    /** 그 밖의 서버 — 4번째 칸이 네트워크 */
    SERVER_NET(ResourceKind.SYSTEM_DISK, ResourceKind.MEMORY, ResourceKind.CPU, ResourceKind.NETWORK),
    /** 1 방화벽 */
    FIREWALL(ResourceKind.LOG_SSD, ResourceKind.MEMORY, ResourceKind.CPU, ResourceKind.SESSION),
    /** 2 스위치. 코어 수를 알면 1번 칸이 LOAD 대신 CPU 가 된다(switch.cpu-cores). */
    SWITCH(ResourceKind.LOAD, ResourceKind.MEMORY, ResourceKind.PORT_USAGE, ResourceKind.BANDWIDTH);

    private final List<ResourceKind> kinds;

    ResourceLayout(ResourceKind... kinds) {
        this.kinds = List.of(kinds);
    }

    public List<ResourceKind> kinds() { return kinds; }

    /** 값이 없을 때 4칸 — 전부 속 빈 회색(실측 대기). */
    public List<ResourceReading> pending() {
        return kinds.stream().map(ResourceReading::pending).toList();
    }
}
