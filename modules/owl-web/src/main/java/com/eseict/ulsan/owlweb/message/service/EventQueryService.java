package com.eseict.ulsan.owlweb.message.service;

import com.eseict.ulsan.owlweb.common.region.RegionRepository;
import com.eseict.ulsan.owlweb.message.domain.DisasterType;
import com.eseict.ulsan.owlweb.message.domain.DisasterTypeDetail;
import com.eseict.ulsan.owlweb.message.domain.Message;
import com.eseict.ulsan.owlweb.message.dto.EventSubTypeResponse;
import com.eseict.ulsan.owlweb.message.dto.EventTypeResponse;
import com.eseict.ulsan.owlweb.message.dto.MessageResponse;
import com.eseict.ulsan.owlweb.message.repository.DisasterTypeDetailRepository;
import com.eseict.ulsan.owlweb.message.repository.DisasterTypeRepository;
import com.eseict.ulsan.owlweb.message.repository.MessageRepository;
import com.eseict.ulsan.owlweb.message.repository.MessageSpecs;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * 이벤트 조회 (gis 호환) — 종류(id 기반, "기타" NOT IN) + 지역 다중선택 필터.
 *
 * <p>응답은 gis 형식({@link MessageResponse} = EventResponse, {@link EventTypeResponse})으로 반환한다.
 * 실시간 SSE 는 {@link com.eseict.ulsan.owlweb.message.service.MessageSseService} 참고.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class EventQueryService {

    private final MessageRepository messageRepository;
    private final DisasterTypeRepository disasterTypeRepository;
    private final DisasterTypeDetailRepository disasterTypeDetailRepository;
    private final RegionRepository regionRepository;

    /**
     * 이벤트 종류 트리 (대분류 → 소분류). 검색조건 드롭다운용.
     *
     * <p>소분류를 대분류별로 한 번에 묶어 내려주므로 프론트가 호출 한 번으로 트리를 그린다.
     * 소분류 목록을 아직 못 받은 대분류는 {@code children} 이 빈 배열.
     */
    public List<EventTypeResponse> eventTypes() {
        Map<String, List<EventSubTypeResponse>> byGroup =
                disasterTypeDetailRepository.findAllByOrderByGroupCodeAscDisplayOrderAsc().stream()
                        .map(EventSubTypeResponse::from)
                        .collect(Collectors.groupingBy(EventSubTypeResponse::groupCode));

        return disasterTypeRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(d -> EventTypeResponse.of(d, byGroup.getOrDefault(d.getCode(), List.of())))
                .toList();
    }

    /**
     * 이벤트 종류 소분류 목록. {@code typeIds} 를 주면 그 대분류에 속한 것만,
     * 생략하면 전체(부엉이 코드목록 전량)를 대분류 순 → 대분류 내 순서로 반환한다.
     */
    public List<EventSubTypeResponse> eventSubTypes(List<Long> typeIds) {
        List<DisasterTypeDetail> details;
        if (typeIds == null || typeIds.isEmpty()) {
            details = disasterTypeDetailRepository.findAllByOrderByGroupCodeAscDisplayOrderAsc();
        } else {
            details = disasterTypeDetailRepository
                    .findByGroupCodeInOrderByGroupCodeAscDisplayOrderAsc(groupCodes(typeIds));
        }
        return details.stream().map(EventSubTypeResponse::from).toList();
    }

    /**
     * 이벤트 목록 (발생일시 최신순).
     *
     * <p>필터 결합: {@code (대분류 ∪ 소분류) ∧ 지역}. 종류 쪽을 합집합으로 두는 건
     * 검색조건 트리에서 부모/자식을 섞어 체크할 수 있기 때문이다.
     *
     * @param typeIds   이벤트 종류 id 목록 ({@code disaster_type.id} = 재난유형 대분류).
     *                  null/빈값이면 종류 제한 없음. {@code disaster_type_group IN}.
     * @param regionIds 지역 id 목록 ({@code region.id}). null/빈값이면 지역 제한 없음.
     *                  {@code region_id IN}.
     */
    public List<MessageResponse> events(List<Long> typeIds, List<Long> regionIds,
                                        List<Long> subTypeIds) {
        List<Specification<Message>> specs = new ArrayList<>();
        // 종류 조건은 대분류 ∪ 소분류 (트리에서 부모/자식을 섞어 체크한 걸 합집합으로 본다).
        // AND 로 묶으면 "긴급구조 전체 + 사회재난>화재" 같은 선택이 0건이 된다.
        Specification<Message> kindSpec = null;
        if (typeIds != null && !typeIds.isEmpty()) {
            kindSpec = typeSpec(typeIds);
        }
        if (subTypeIds != null && !subTypeIds.isEmpty()) {
            Specification<Message> sub = subTypeSpec(subTypeIds);
            kindSpec = (kindSpec == null) ? sub : kindSpec.or(sub);
        }
        if (kindSpec != null) {
            specs.add(kindSpec);
        }
        // 지역은 종류 조건과 AND (종류 ∧ 지역).
        if (regionIds != null && !regionIds.isEmpty()) {
            specs.add(regionSpec(regionIds));
        }
        Specification<Message> spec = Specification.allOf(specs);

        return messageRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "occurDtm")).stream()
                .map(MessageResponse::from)
                .toList();
    }

    /** 종류 필터 — id → 대분류 코드 변환 후 disaster_type_group IN. */
    private Specification<Message> typeSpec(List<Long> typeIds) {
        return MessageSpecs.disasterGroupIn(groupCodes(typeIds));
    }

    /** 소분류 필터 — id → 소분류 코드 변환 후 disaster_type_code IN. */
    private Specification<Message> subTypeSpec(List<Long> subTypeIds) {
        List<DisasterTypeDetail> details = disasterTypeDetailRepository.findAllById(subTypeIds);
        if (details.size() != subTypeIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "존재하지 않는 이벤트 소분류 id 포함");
        }
        return MessageSpecs.disasterTypeCodeIn(
                details.stream().map(DisasterTypeDetail::getCode).toList());
    }

    /** 대분류 id 목록 → 대분류 코드 목록. 없는 id 가 섞이면 400. */
    private List<String> groupCodes(List<Long> typeIds) {
        List<DisasterType> types = disasterTypeRepository.findAllById(typeIds);
        if (types.size() != typeIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "존재하지 않는 이벤트 종류 id 포함");
        }
        return types.stream().map(DisasterType::getCode).toList();
    }

    /** 지역 필터 — region_id IN. 없는 id 가 섞이면 400. */
    private Specification<Message> regionSpec(List<Long> regionIds) {
        if (regionRepository.findAllById(regionIds).size() != regionIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "존재하지 않는 지역 id 포함");
        }
        return MessageSpecs.regionIdIn(regionIds);
    }
}
