package com.eseict.ulsan.server.sw.snmp;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SwEventRepository extends JpaRepository<SwEvent, Long> {

    List<SwEvent> findByOrderByAtDescIdDesc(Pageable pageable);
}
