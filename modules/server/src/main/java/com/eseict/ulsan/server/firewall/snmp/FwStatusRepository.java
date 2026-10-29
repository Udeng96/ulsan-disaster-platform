package com.eseict.ulsan.server.firewall.snmp;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FwStatusRepository extends JpaRepository<FwStatus, Long> {
    Optional<FwStatus> findTopByOrderByCollectedAtDesc();
}
