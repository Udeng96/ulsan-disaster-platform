package com.eseict.ulsan.gis.oms;

import com.eseict.ulsan.gis.oms.dto.OmsRolesDepartmentsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * OMS 조회 (읽기 전용).
 *
 * <p>{@code GET /api/oms/roles-departments} — 이벤트 롤(권한) + 울산 부서를 한 응답에.
 */
@RestController
@RequestMapping("/api/oms")
@RequiredArgsConstructor
public class OmsQueryController {

    private final OmsQueryService service;

    @GetMapping("/roles-departments")
    public OmsRolesDepartmentsResponse rolesAndDepartments() {
        return service.rolesAndDepartments();
    }
}
