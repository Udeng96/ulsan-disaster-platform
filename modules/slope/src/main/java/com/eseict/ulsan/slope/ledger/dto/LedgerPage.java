package com.eseict.ulsan.slope.ledger.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/** DSSP-IF-10158 페이지 응답. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record LedgerPage(Header header, Integer totalCount, List<LedgerItem> body) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Header(String resultCode, String resultMsg, String errorMsg) {
    }

    /** 정상 응답 코드는 "00". */
    public boolean isOk() {
        return header != null && "00".equals(header.resultCode());
    }

    public List<LedgerItem> items() {
        return body == null ? List.of() : body;
    }
}
