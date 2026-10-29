package com.eseict.ulsan.server.firewall.snmp;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FwPolicyChangeRepository extends JpaRepository<FwPolicyChange, Long> {

    Optional<FwPolicyChange> findTopByOrderByChangedAtDesc();

    List<FwPolicyChange> findByOrderByChangedAtDesc(Pageable pageable);
}
