package com.eseict.ulsan.slope.facility;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SlopeAreaRepository extends JpaRepository<SlopeArea, Long> {

    Optional<SlopeArea> findByVendorId(Long vendorId);

    List<SlopeArea> findAllByOrderByIdAsc();
}
