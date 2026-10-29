package com.eseict.ulsan.owlweb.message.repository;

import com.eseict.ulsan.owlweb.message.domain.DisasterTypeDetail;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DisasterTypeDetailRepository extends JpaRepository<DisasterTypeDetail, Long> {

    /** 전체 소분류 — 대분류 순서 → 대분류 내 순서. */
    List<DisasterTypeDetail> findAllByOrderByGroupCodeAscDisplayOrderAsc();

    /** 특정 대분류들의 소분류만. */
    List<DisasterTypeDetail> findByGroupCodeInOrderByGroupCodeAscDisplayOrderAsc(
            Collection<String> groupCodes);
}
