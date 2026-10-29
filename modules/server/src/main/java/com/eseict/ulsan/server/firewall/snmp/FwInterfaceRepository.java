package com.eseict.ulsan.server.firewall.snmp;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FwInterfaceRepository extends JpaRepository<FwInterface, Long> {

    @Query("""
            select i from FwInterface i
            where i.collectedAt = (select max(x.collectedAt) from FwInterface x)
            """)
    List<FwInterface> findLatest();
}
