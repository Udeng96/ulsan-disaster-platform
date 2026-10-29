package com.eseict.ulsan.owlweb.ingest.dto;

import com.eseict.ulsan.owlweb.message.domain.MsgType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 연계모듈(owl)의 {@code GET /owl/collect} 응답 1건.
 *
 * <p>owl 의 {@code CollectedMessage} 와 동일한 필드/순서. 일시 파싱·주소 fallback·좌표
 * 정규화·{@link MsgType} 변환은 owl 에서 이미 끝난 값이라 여기선 그대로 엔티티에 옮긴다.
 * {@code id}/적재시각은 이 모듈이 저장하면서 부여하므로 포함되지 않고,
 * 멱등 저장 키인 {@code msgId}+{@code msgSn} 은 항상 채워져 온다.
 */
public record CollectedMessage(
        String msgId,
        String msgSn,
        LocalDateTime sendDtm,
        MsgType msgType,
        String disasterTypeCode,
        String disasterTypeName,
        String title,
        LocalDateTime occurDtm,
        String endStatus,
        String regionName,
        String addr,
        String roadAddr,
        BigDecimal lat,
        BigDecimal lng,
        String summary          // 상황 상세 (여러 줄: 신고일시/신고내역/진행상황)
) {
}
