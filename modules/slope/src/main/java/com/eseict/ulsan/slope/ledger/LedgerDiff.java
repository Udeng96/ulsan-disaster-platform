package com.eseict.ulsan.slope.ledger;

import com.eseict.ulsan.slope.facility.ManagedArea;
import com.eseict.ulsan.slope.ledger.dto.LedgerItem;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * 안전데이터 대장과 {@code slope.managed_area} 의 차이 건수.
 *
 * <p>폐지(DEL_YN='Y') 처리 규칙 — 같은 이름의 새 관리번호가 있으면 재등록이므로 <b>수정</b>,
 * 없으면 <b>삭제</b>. 관리번호는 폐지 후 재등록되며 바뀌기 때문에 이름으로 짝을 찾는다.
 *
 * <p>이름 비교는 공백을 제거하고 한다 — DB 와 API 의 급경사지명이 공백만 다른 경우가 있다
 * ({@code 가상시설0533} ↔ {@code 영남 장생포151}).
 */
public record LedgerDiff(int toAdd, int toUpdate, int toDelete) {

    public static LedgerDiff of(List<ManagedArea> db, List<LedgerItem> api) {
        Map<String, LedgerItem> live = new HashMap<>();
        Map<String, LedgerItem> dead = new HashMap<>();
        Map<String, String> liveNoByName = new HashMap<>();
        for (LedgerItem i : api) {
            if (i.mgmtNo() == null) {
                continue;
            }
            if (i.isDeleted()) {
                dead.put(i.mgmtNo(), i);
            } else {
                live.put(i.mgmtNo(), i);
                liveNoByName.putIfAbsent(norm(i.name()), i.mgmtNo());
            }
        }

        Set<String> dbNos = new HashSet<>();
        db.forEach(s -> dbNos.add(s.getMgmtNo()));

        // 재등록으로 번호만 바뀌는 건은 "추가" 로 중복 집계하지 않는다.
        Set<String> renamedTo = new HashSet<>();
        int toUpdate = 0;
        int toDelete = 0;
        for (ManagedArea s : db) {
            LedgerItem current = live.get(s.getMgmtNo());
            if (current != null) {
                if (differs(s, current)) {
                    toUpdate++;
                }
                continue;
            }
            LedgerItem removed = dead.get(s.getMgmtNo());
            String newNo = (removed == null) ? null : liveNoByName.get(norm(removed.name()));
            if (newNo != null && !dbNos.contains(newNo)) {
                toUpdate++;
                renamedTo.add(newNo);
            } else {
                toDelete++;
            }
        }

        int toAdd = 0;
        for (String no : live.keySet()) {
            if (!dbNos.contains(no) && !renamedTo.contains(no)) {
                toAdd++;
            }
        }
        return new LedgerDiff(toAdd, toUpdate, toDelete);
    }

    /** API 가 제공하는 필드만 비교한다 (행정동·평가등급·비고는 API 에 없어 제외). */
    private static boolean differs(ManagedArea s, LedgerItem i) {
        return !Objects.equals(norm(s.getName()), norm(i.name()))
                || !Objects.equals(s.getLegalDongCode(), i.legalDongCode())
                || !Objects.equals(s.getDepartment(), i.deptName())
                || !sameCoord(s.getLat(), i.lat())
                || !sameCoord(s.getLng(), i.lng());
    }

    private static boolean sameCoord(BigDecimal a, BigDecimal b) {
        return (a == null || b == null) ? a == b : a.compareTo(b) == 0;
    }

    private static String norm(String s) {
        return s == null ? null : s.replaceAll("\\s+", "");
    }
}
