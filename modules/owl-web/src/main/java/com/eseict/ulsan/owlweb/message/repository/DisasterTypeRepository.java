package com.eseict.ulsan.owlweb.message.repository;

import com.eseict.ulsan.owlweb.message.domain.DisasterType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DisasterTypeRepository extends JpaRepository<DisasterType, Long> {

    List<DisasterType> findAllByOrderByDisplayOrderAsc();
}
