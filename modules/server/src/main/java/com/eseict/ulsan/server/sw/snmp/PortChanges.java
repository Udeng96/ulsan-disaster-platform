package com.eseict.ulsan.server.sw.snmp;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 직전 샘플과 지금 샘플을 비교해 포트 변화 기록을 만든다 (⑥ 최근 활동).
 * - 연결됨 / 끊김: link_up 이 바뀜
 * - 에러 늘어남: 받기+보내기 에러 누적이 늘어남 (줄어들면 스위치 재시작이라 무시)
 * - 처음 보는 장비: 아는 장비(sw_known_mac)에도, 직전 MAC 표에도 없던 MAC 이 나타남 — 한 번만 남긴다
 * 직전 샘플이 없으면(재기동 직후) 포트 변화는 남기지 않는다.
 */
public final class PortChanges {

    private PortChanges() {
    }

    /** ge1 → P1, xe1 → SFP1. 화면 앞면 라벨. */
    public static String label(String ifName) {
        if (ifName.startsWith("ge")) return "P" + ifName.substring(2);
        if (ifName.startsWith("xe")) return "SFP" + ifName.substring(2);
        return ifName;
    }

    public static List<SwEvent> ports(Map<Integer, SwInterface> previous, Collection<SwInterface> current, OffsetDateTime now) {
        List<SwEvent> out = new ArrayList<>();
        for (SwInterface cur : current) {
            SwInterface prev = previous.get(cur.getIfIndex());
            if (prev == null) continue;
            String l = label(cur.getIfName());
            if (prev.isLinkUp() != cur.isLinkUp()) {
                out.add(cur.isLinkUp()
                        ? new SwEvent(now, cur.getIfName(), SwEvent.Kind.LINK_UP,
                                l + " 연결됨" + (cur.getSpeedMbps() == null ? "" : " " + speed(cur.getSpeedMbps())))
                        : new SwEvent(now, cur.getIfName(), SwEvent.Kind.LINK_DOWN, l + " 끊김"));
            }
            Long a = prev.totalErrors();
            Long b = cur.totalErrors();
            if (a != null && b != null && b > a) {
                out.add(new SwEvent(now, cur.getIfName(), SwEvent.Kind.ERROR, l + " 에러 늘어남 (+" + (b - a) + ")"));
            }
        }
        return out;
    }

    public static List<SwEvent> newMacs(Map<String, String> currentMacToIf, Set<String> previousMacs, Set<String> known,
                                        OffsetDateTime now) {
        List<SwEvent> out = new ArrayList<>();
        currentMacToIf.forEach((mac, ifName) -> {
            if (!known.contains(mac) && !previousMacs.contains(mac)) {
                out.add(new SwEvent(now, ifName, SwEvent.Kind.NEW_MAC, label(ifName) + " 처음 보는 장비 (MAC " + mac + ")"));
            }
        });
        return out;
    }

    private static String speed(int mbps) {
        return mbps >= 1000 && mbps % 1000 == 0 ? (mbps / 1000) + "G" : mbps + "M";
    }
}
