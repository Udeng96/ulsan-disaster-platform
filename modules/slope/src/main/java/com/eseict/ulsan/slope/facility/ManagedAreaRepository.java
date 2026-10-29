package com.eseict.ulsan.slope.facility;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ManagedAreaRepository extends JpaRepository<ManagedArea, Long> {

    /**
     * 관리지역 전건. 관리번호 오름차순.
     *
     * <p>정렬 기능이 아니라 결정적 기본 순서를 보장하기 위한 것이다 — 화면이 다시 정렬한다.
     */
    List<ManagedArea> findAllByOrderByMgmtNoAsc();
}
