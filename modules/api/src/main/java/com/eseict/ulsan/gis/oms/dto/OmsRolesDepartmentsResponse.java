package com.eseict.ulsan.gis.oms.dto;

import com.eseict.ulsan.gis.oms.OmsDepartment;
import com.eseict.ulsan.gis.oms.OmsEventRole;
import java.util.List;

/**
 * 이벤트 롤 + 울산 부서 통합 응답 (한 endpoint).
 */
public record OmsRolesDepartmentsResponse(
        List<EventRoleItem> eventRoles,
        List<DepartmentItem> departments
) {

    public record EventRoleItem(String id, String name, String description) {
        public static EventRoleItem from(OmsEventRole r) {
            return new EventRoleItem(r.getId(), r.getName(), r.getDescription());
        }
    }

    public record DepartmentItem(String id, String code, String name) {
        public static DepartmentItem from(OmsDepartment d) {
            return new DepartmentItem(d.getId(), d.getCode(), d.getName());
        }
    }

    public static OmsRolesDepartmentsResponse of(List<OmsEventRole> roles, List<OmsDepartment> depts) {
        return new OmsRolesDepartmentsResponse(
                roles.stream().map(EventRoleItem::from).toList(),
                depts.stream().map(DepartmentItem::from).toList()
        );
    }
}
