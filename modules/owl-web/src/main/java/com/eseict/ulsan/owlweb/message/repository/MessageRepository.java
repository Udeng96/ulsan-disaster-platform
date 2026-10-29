package com.eseict.ulsan.owlweb.message.repository;

import com.eseict.ulsan.owlweb.message.domain.Message;
import java.util.Collection;
import java.util.Set;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 상황전파 메시지 조회/적재. 검색 필터(재난종류/지역 다중 선택)는
 * {@link JpaSpecificationExecutor} 로 동적 조합한다 ({@code MessageSpecs} 참고).
 */
public interface MessageRepository
        extends JpaRepository<Message, Long>, JpaSpecificationExecutor<Message> {

    /**
     * 폴링 배치의 중복 판별용 — 받은 msgId 들에 해당하는 기존 키를 <b>한 번에</b> 가져온다.
     *
     * <p>건별 조회로 하면 owl 응답 건수만큼 SELECT 가 나가고, 대부분은 "이미 있음" 확인만
     * 하고 버려진다. 엔티티가 아니라 키 문자열만 뽑아 비교 비용도 최소화한다.
     * {@code msgSn} 까지 조건에 넣지 않는 것은 (msgId, msgSn) 쌍 IN 이 JPQL 로 지저분해서다 —
     * msgId 로 좁혀도 한 msgId 의 보고 차수는 몇 건뿐이라 결과 집합이 거의 안 커진다.
     */
    @Query("select m.msgId || '|' || m.msgSn from Message m where m.msgId in :msgIds")
    Set<String> findKeysByMsgIdIn(@Param("msgIds") Collection<String> msgIds);
}
