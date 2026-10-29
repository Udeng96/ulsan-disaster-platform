package com.eseict.ulsan.owlweb.message.dto;

import com.eseict.ulsan.owlweb.message.domain.DisasterTypeDetail;

/**
 * 이벤트 종류 소분류 응답. {@code groupCode} 로 어느 대분류에 속하는지 알 수 있어,
 * 프론트가 대분류 선택에 따라 소분류 목록을 걸러 보여줄 수 있다.
 */
public record EventSubTypeResponse(Long id, String name, String code, String groupCode) {

    public static EventSubTypeResponse from(DisasterTypeDetail d) {
        return new EventSubTypeResponse(d.getId(), d.getName(), d.getCode(), d.getGroupCode());
    }
}
