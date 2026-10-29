package com.eseict.ulsan.owl.collect.dto;

import com.eseict.ulsan.owl.collect.MsgType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 연계모듈(행정망)이 부엉이에서 조회해 내부망으로 응답하는 메시지.
 *
 * <p>내부망 owl-server 가 그대로 DB(owl.message)에 저장할 수 있게 <b>저장 전체 필드</b>를 담는다
 * (대시보드 표출용 축약본 아님). {@code id}/적재시각은 내부망 저장 시 부여되므로 제외.
 * 멱등 저장 키가 되도록 {@code msgId}+{@code msgSn} 포함.
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
        String summary
) {
}
