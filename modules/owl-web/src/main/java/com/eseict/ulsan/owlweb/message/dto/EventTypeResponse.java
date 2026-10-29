package com.eseict.ulsan.owlweb.message.dto;

import com.eseict.ulsan.owlweb.message.domain.DisasterType;
import java.util.List;

/**
 * 이벤트 종류 대분류 + 하위 소분류 (검색조건 트리).
 *
 * <p>{@code children} 은 이 대분류에 속한 소분류 목록. 프론트는 부모를 체크하면
 * {@code typeIds}, 자식을 체크하면 {@code subTypeIds} 로 보내면 된다 (둘은 OR).
 * 부모 id 와 자식 id 는 서로 다른 테이블의 것이라 값이 겹칠 수 있다 — 트리 노드 키로 쓸 땐
 * 계층을 함께 구분해야 한다.
 *
 * <p>대분류 9(공지/안내)처럼 소분류 코드목록을 아직 못 받은 경우 {@code children} 이 빈 배열이다.
 */
public record EventTypeResponse(
        Long id,
        String name,
        String code,
        List<EventSubTypeResponse> children
) {

    public static EventTypeResponse of(DisasterType d, List<EventSubTypeResponse> children) {
        return new EventTypeResponse(d.getId(), d.getName(), d.getCode(), children);
    }
}
