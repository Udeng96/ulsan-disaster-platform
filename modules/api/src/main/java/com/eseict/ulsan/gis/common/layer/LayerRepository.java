package com.eseict.ulsan.gis.common.layer;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LayerRepository extends JpaRepository<Layer, Long> {

    /** 사용중인 레이어만 표출 순서대로. */
    List<Layer> findByActiveTrueOrderByDisplayOrderAsc();

    /** code 로 단건 조회 (색 변경용). */
    Optional<Layer> findByCode(String code);
}
