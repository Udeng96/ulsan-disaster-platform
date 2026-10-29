package com.eseict.ulsan.gis.oms;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OmsEventRoleRepository extends JpaRepository<OmsEventRole, String> {

    List<OmsEventRole> findAllByOrderByNameAsc();
}
