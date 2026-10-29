package com.eseict.ulsan.server.firewall.snmp;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FwPolicyRepository extends JpaRepository<FwPolicy, Integer> {
}
