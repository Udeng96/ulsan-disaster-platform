package com.eseict.ulsan.owlweb.message.controller;

import com.eseict.ulsan.owlweb.message.dto.EventSubTypeResponse;
import com.eseict.ulsan.owlweb.message.dto.EventTypeResponse;
import com.eseict.ulsan.owlweb.message.dto.MessageResponse;
import com.eseict.ulsan.owlweb.message.service.EventQueryService;
import com.eseict.ulsan.owlweb.message.service.MessageSseService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 이벤트 조회(gis 호환) + 실시간 구독. 모든 외부 경로는 {@code /owl/events*} 로 통일.
 *
 * <ul>
 *   <li>{@code GET /owl/events} — 이벤트 목록 (대분류 typeIds / 소분류 subTypeIds / 지역 regionIds
 *       다중 필터, 셋 다 AND, 발생일시순, 생략 시 전체)</li>
 *   <li>{@code GET /owl/event-types} — 이벤트 종류 대분류 목록 (id/name/code)</li>
 *   <li>{@code GET /owl/event-sub-types} — 소분류 목록 (typeIds 로 대분류 좁힘, 2단계 드롭다운용)</li>
 *   <li>{@code GET /owl/events/stream} — SSE 실시간 구독 (event name: owl-message)</li>
 * </ul>
 * (공통 prefix {@code /owl} 은 server.servlet.context-path)
 */
@RestController
@RequiredArgsConstructor
public class EventController {

    private final EventQueryService service;
    private final MessageSseService sseService;

    @GetMapping("/event-types")
    public List<EventTypeResponse> eventTypes() {
        return service.eventTypes();
    }

    @GetMapping("/event-sub-types")
    public List<EventSubTypeResponse> eventSubTypes(
            @RequestParam(required = false) List<Long> typeIds) {
        return service.eventSubTypes(typeIds);
    }

    @GetMapping("/events")
    public List<MessageResponse> events(
            @RequestParam(required = false) List<Long> typeIds,
            @RequestParam(required = false) List<Long> regionIds,
            @RequestParam(required = false) List<Long> subTypeIds) {
        return service.events(typeIds, regionIds, subTypeIds);
    }

    @GetMapping(value = "/events/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        return sseService.subscribe();
    }
}
