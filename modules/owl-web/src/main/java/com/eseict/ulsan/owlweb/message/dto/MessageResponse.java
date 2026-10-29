package com.eseict.ulsan.owlweb.message.dto;

import com.eseict.ulsan.owlweb.message.domain.Message;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 상황전파 메시지 — 목록/SSE 전달 형식.
 */
public record MessageResponse(
        Long id,
        String msgId,
        String disasterTypeCode,
        String disasterTypeName,
        String title,
        LocalDateTime occurDtm,
        LocalDateTime sendDtm,
        String endStatus,
        String regionName,
        String addr,
        String roadAddr,
        BigDecimal lat,
        BigDecimal lng,
        String summary
) {
    public static MessageResponse from(Message m) {
        return new MessageResponse(
                m.getId(),
                m.getMsgId(),
                m.getDisasterTypeCode(),
                m.getDisasterTypeName(),
                m.getTitle(),
                m.getOccurDtm(),
                m.getSendDtm(),
                m.getEndStatus(),
                m.getRegionName(),
                m.getAddr(),
                m.getRoadAddr(),
                m.getLat(),
                m.getLng(),
                m.getSummary()
        );
    }
}
