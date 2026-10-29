package com.eseict.ulsan.gis.oms;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface OmsDepartmentRepository extends JpaRepository<OmsDepartment, String> {

    /** 울산 부서 (관리자 부서 MANAGER 제외). */
    @Query("""
            SELECT d FROM OmsDepartment d
            WHERE d.clientCode = 'ULSAN' AND d.code <> 'MANAGER'
            ORDER BY d.code ASC
            """)
    List<OmsDepartment> findUlsanDepartments();
}
