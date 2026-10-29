package com.eseict.ulsan.server.firewall.syslog;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FwLogOffsetRepository extends JpaRepository<FwLogOffset, String> {
}
