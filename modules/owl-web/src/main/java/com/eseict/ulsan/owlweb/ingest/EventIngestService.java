package com.eseict.ulsan.owlweb.ingest;

import com.eseict.ulsan.owlweb.common.region.RegionResolver;
import com.eseict.ulsan.owlweb.ingest.dto.CollectedMessage;
import com.eseict.ulsan.owlweb.message.domain.DisasterGroup;
import com.eseict.ulsan.owlweb.message.domain.Message;
import com.eseict.ulsan.owlweb.message.domain.MsgType;
import com.eseict.ulsan.owlweb.message.dto.MessageResponse;
import com.eseict.ulsan.owlweb.message.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * owl 에서 받은 신규 메시지 1건 적재.
 *
 * <p>중복 판별은 호출측(poller)이 배치로 끝내고, 여기엔 신규 건만 들어온다. 그래도
 * {@code (msg_id, msg_sn)} UNIQUE 제약은 그대로 두어 판별~저장 사이의 경합을 막는다
 * (제약 위반은 poller 가 건별로 잡아 그 건만 버린다).
 *
 * <p>원본 파싱/매핑(일시·좌표·주소 fallback·구분 코드)은 owl 이 끝낸 상태로 오므로
 * 여기선 변환하지 않는다. 예외 셋:
 * <ul>
 *   <li>{@code msg_type} — 컬럼이 NOT NULL 이라 비어 오면 문서 default 로 채운다</li>
 *   <li>{@code region_id} — 위치명으로 행정동을 찾아 채운다 (지역 필터 키)</li>
 *   <li>{@code disaster_type_group} — 부엉이가 대분류를 안 주므로 소분류 코드에서 역산한다</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class EventIngestService {

    private static final Logger log = LoggerFactory.getLogger(EventIngestService.class);

    private final MessageRepository messageRepository;
    private final RegionResolver regionResolver;

    /**
     * 신규 메시지 1건 저장 (건별 트랜잭션). 한 건씩 커밋되므로 호출측이 커밋 이후 SSE push 한다.
     *
     * @return 저장된 메시지 (SSE push 대상)
     */
    @Transactional
    public MessageResponse insert(CollectedMessage m) {
        MsgType msgType = m.msgType() != null ? m.msgType() : MsgType.RESPONSE_ORDER;
        DisasterGroup group = DisasterGroup.fromDisasterTypeCode(m.disasterTypeCode());

        Long regionId = regionResolver.resolve(m.regionName());

        Message saved = messageRepository.save(Message.of(m.msgId(), m.msgSn(), m.sendDtm(),
                msgType, m.disasterTypeCode(), m.disasterTypeName(), m.title(), m.occurDtm(),
                m.endStatus(), regionId, m.regionName(), m.addr(), m.roadAddr(),
                m.lat(), m.lng(), m.summary(), group == null ? null : group.getCode()));

        log.info("========= New Event =========\n"
                        + "  id={} msgId={} msgSn={} disasterType={}({}) group={} msgType={} region={} coord=({},{}) sendDtm={}",
                saved.getId(), saved.getMsgId(), saved.getMsgSn(), m.disasterTypeName(),
                m.disasterTypeCode(), group == null ? "미분류" : group.getLabel(), msgType,
                m.regionName(), m.lat(), m.lng(), m.sendDtm());
        return MessageResponse.from(saved);
    }
}
