package com.eseict.ulsan.server.domain;

import java.util.ArrayList;
import java.util.List;

/**
 * 리눅스 서버(3~13번)에서 읽은 자원 원재료. 비율은 % (0~100). load 는 1·5·15분 평균 부하, threads 는 논리 CPU 수.
 * resources(layout) 가 이걸 동그라미 4칸으로 바꾼다. 방화벽·스위치는 이걸 쓰지 않고 자기 수집기가 칸을 바로 만든다.
 */
public record HostMetrics(
        Integer threads,
        Double load1, Double load5, Double load15,
        Double cpuPct,
        Double memPct,
        Double diskRootPct,
        Double diskDataPct,
        Double networkPct) {

    public static final HostMetrics EMPTY = new HostMetrics(null, null, null, null, null, null, null, null, null);

    /** CPU 사용률: 실측 cpuPct 가 있으면 그것, 없으면 5분 부하 ÷ 스레드(없으면 1분). 둘 다 없으면 null. */
    public Double effectiveCpuPct() {
        if (cpuPct != null) return cpuPct;
        Double load = load5 != null ? load5 : load1;
        if (load == null || threads == null || threads <= 0) return null;
        return Math.round(load / threads * 1000.0) / 10.0;
    }

    /** 서버 칸 구성(SERVER_DATA · SERVER_NET)일 때만 값을 채운다. 다른 구성이면 전부 실측 대기. */
    public List<ResourceReading> resources(ResourceLayout layout) {
        if (layout != ResourceLayout.SERVER_DATA && layout != ResourceLayout.SERVER_NET) return layout.pending();
        List<ResourceReading> out = new ArrayList<>(4);
        out.add(ResourceReading.of(ResourceKind.SYSTEM_DISK, diskRootPct, null));
        out.add(ResourceReading.of(ResourceKind.MEMORY, memPct, null));
        Double load = load5 != null ? load5 : load1;
        String cpuDetail = threads != null && load != null ? KeyMetricRule.fmt1(load) + "/" + threads + "코어" : null;
        out.add(ResourceReading.of(ResourceKind.CPU, effectiveCpuPct(), cpuDetail));
        if (layout == ResourceLayout.SERVER_DATA) out.add(ResourceReading.of(ResourceKind.DATA_DISK, diskDataPct, null));
        else out.add(ResourceReading.of(ResourceKind.NETWORK, networkPct, networkPct == null ? null : "1G 대비"));
        return out;
    }
}
