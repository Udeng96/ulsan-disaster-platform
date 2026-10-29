package com.eseict.ulsan.server.repository;

import com.eseict.ulsan.server.entity.Server;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ServerRepository extends JpaRepository<Server, Long> {

    Optional<Server> findByHost(String host);

    List<Server> findAllByOrderBySeqAsc();
}
