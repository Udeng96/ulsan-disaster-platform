package com.eseict.ulsan.server.dto;

import com.eseict.ulsan.server.domain.Verdict;

/**
 * 메인 「시스템 운영현황」 카드 한 장 (다섯 줄). 13장이 같은 모양.
 * ① seq·shortName·dot  ② verdict·uptimeText  ③ keyLabel  ④ keyValue + keyAux
 */
public record ServerCardResponse(
        int seq,
        String host,
        String shortName,
        Verdict verdict,
        String verdictLabel,
        String color,
        /** DIRECT/SNMP = true(●), INDIRECT = false(○) */
        boolean directDot,
        /** 「가동 214일 · 응답 정상」 또는 「행정망 · 간접 확인」 */
        String subLine,
        String keyLabel,
        String keyValue,
        String keyAux,
        Verdict keyVerdict) {
}
