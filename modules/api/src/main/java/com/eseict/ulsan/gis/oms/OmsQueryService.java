package com.eseict.ulsan.gis.oms;

import com.eseict.ulsan.gis.oms.dto.OmsRolesDepartmentsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class OmsQueryService {

    private final OmsEventRoleRepository eventRoleRepository;
    private final OmsDepartmentRepository departmentRepository;

    /** 이벤트 롤 + 울산 부서 한 번에. */
    public OmsRolesDepartmentsResponse rolesAndDepartments() {
        return OmsRolesDepartmentsResponse.of(
                eventRoleRepository.findAllByOrderByNameAsc(),
                departmentRepository.findUlsanDepartments()
        );
    }
}
