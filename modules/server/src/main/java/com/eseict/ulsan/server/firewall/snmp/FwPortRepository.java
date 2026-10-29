package com.eseict.ulsan.server.firewall.snmp;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FwPortRepository extends JpaRepository<FwPort, String> {
    List<FwPort> findAllByOrderBySortNoAsc();
}
