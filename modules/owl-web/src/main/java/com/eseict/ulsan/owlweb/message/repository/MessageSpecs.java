package com.eseict.ulsan.owlweb.message.repository;

import com.eseict.ulsan.owlweb.message.domain.Message;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

/**
 * 이벤트 검색 조건 조합 (gis 호환 id 기반 필터에서 사용). 호출부에서 빈 리스트를 막는다.
 */
public final class MessageSpecs {

    private MessageSpecs() {
    }

    /** 재난유형 소분류 코드 IN — message 는 소분류 코드를 그대로 저장한다. */
    public static Specification<Message> disasterTypeCodeIn(List<String> codes) {
        return (root, query, cb) -> root.get("disasterTypeCode").in(codes);
    }

    /** 재난유형 대분류 코드 IN (1자연/2사회/4해외/5모의훈련/6긴급구조/9공지). */
    public static Specification<Message> disasterGroupIn(List<String> groupCodes) {
        return (root, query, cb) -> root.get("disasterTypeGroup").in(groupCodes);
    }

    /** 지역(행정동 id) IN — 저장 시 채운 {@code region_id}. 지역을 못 찾은 메시지(null)는 걸리지 않는다. */
    public static Specification<Message> regionIdIn(List<Long> regionIds) {
        return (root, query, cb) -> root.get("regionId").in(regionIds);
    }
}
