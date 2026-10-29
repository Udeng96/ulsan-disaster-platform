package com.eseict.ulsan.server.repository;

import com.eseict.ulsan.server.entity.ServerSpec;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ServerSpecRepository extends JpaRepository<ServerSpec, Long> {

    Optional<ServerSpec> findByServerId(Long serverId);
}
