package com.eseict.ulsan.server.firewall.snmp;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * 직전 정책 표와 지금 정책 표 비교. 정책 이름으로 맞춘다 (SNMP 인덱스는 정책 순서를 바꾸면 달라질 수 있어서).
 * added = 새로 생긴 이름, removed = 없어진 이름, actionChanged = 같은 이름인데 허용 ↔ 차단이 바뀐 것.
 */
public record PolicyDiff(List<String> added, List<String> removed, List<String> actionChanged) {

    public boolean isEmpty() {
        return added.isEmpty() && removed.isEmpty() && actionChanged.isEmpty();
    }

    public static PolicyDiff of(List<FwPolicy> before, List<FwPolicy> after) {
        Map<String, String> was = byName(before);
        Map<String, String> now = byName(after);
        List<String> added = new ArrayList<>();
        List<String> changed = new ArrayList<>();
        now.forEach((name, action) -> {
            if (!was.containsKey(name)) added.add(name);
            else if (!Objects.equals(was.get(name), action)) changed.add(name);
        });
        List<String> removed = was.keySet().stream().filter(n -> !now.containsKey(n)).toList();
        return new PolicyDiff(added, removed, changed);
    }

    private static Map<String, String> byName(List<FwPolicy> rows) {
        Map<String, String> m = new LinkedHashMap<>();
        rows.stream()
                .sorted((a, b) -> Integer.compare(a.getPolicyIdx(), b.getPolicyIdx()))
                .forEach(p -> m.putIfAbsent(p.getName(), p.getAction()));
        return m;
    }
}
