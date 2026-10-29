package com.eseict.ulsan.server.sw.snmp;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SwPortRepository extends JpaRepository<SwPort, String> {
    List<SwPort> findAllByOrderBySortNoAsc();
}
