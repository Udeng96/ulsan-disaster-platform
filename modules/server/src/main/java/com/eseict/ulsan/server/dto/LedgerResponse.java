package com.eseict.ulsan.server.dto;

import com.eseict.ulsan.server.entity.Server;

import java.time.LocalDate;

/** 자산대장 「관리·계약」 13열 (v3.0 확정). 열 순서가 곧 화면 순서. */
public record LedgerResponse(
        int seq,
        String name,
        String host,
        boolean hostConfirmed,
        String ip,
        String networkName,
        String manager,
        String model,
        String itemId,
        String serialNo,
        LocalDate introDate,
        String vendor,
        String vendorTel,
        String note,
        /** 제조사 (V8, 2026-10-16 수기항목 엑셀). 상부 13열 밖 — 화면에서 쓸지는 화면이 정함 */
        String maker,
        /** 접이식 「기본 정보」에만 쓰는 값 — 상부 표에는 없음 */
        String setName,
        String measureMode) {

    public static LedgerResponse from(Server s) {
        return new LedgerResponse(s.getSeq(), s.getName(), s.getHost(), s.isHostConfirmed(), s.getIp(), s.getNetworkName(),
                s.getManager(), s.getModel(), s.getItemId(), s.getSerialNo(), s.getIntroDate(), s.getVendor(), s.getVendorTel(),
                s.getNote(), s.getMaker(), s.getSetName(), s.getMeasureMode().name());
    }
}
