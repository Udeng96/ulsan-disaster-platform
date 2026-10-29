package com.eseict.ulsan.slope.facility;

import com.eseict.ulsan.slope.facility.dto.ManagedAreaResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ManagedAreaService {

    private final ManagedAreaRepository repository;

    /**
     * 관리지역 전건. 이 규모(목표 165개소)에서는 전부 내려주고 정렬·검색·필터를 화면에서 한다
     * — 한글 정렬/초성 검색/표기 흔들림 처리가 클라이언트에서 정확하다.
     */
    public List<ManagedAreaResponse> list() {
        return repository.findAllByOrderByMgmtNoAsc().stream()
                .map(ManagedAreaResponse::from)
                .toList();
    }
}
