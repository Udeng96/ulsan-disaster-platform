package com.eseict.ulsan.gis.common.region;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RegionRepository extends JpaRepository<Region, Long> {

    List<Region> findAllByOrderByDisplayOrderAsc();
}
