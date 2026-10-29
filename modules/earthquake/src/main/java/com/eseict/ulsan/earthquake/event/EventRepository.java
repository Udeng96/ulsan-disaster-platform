package com.eseict.ulsan.earthquake.event;

import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventRepository extends JpaRepository<Event, Long> {

    /**
     * 자연키 조회.
     *
     * <p>기상청 이벤트는 {@code net}/{@code obsId} 가 null 인데, SQL 에서 {@code = NULL} 은
     * 아무것도 못 맞춘다. {@code COALESCE} 로 빈 문자열을 씌워 비교한다 — V5 의 유니크
     * 인덱스와 같은 방식이다.
     */
    @Query("""
            SELECT e FROM Event e
            WHERE e.evtType = :evtType
              AND e.evtId = :evtId
              AND COALESCE(e.net, '') = COALESCE(:net, '')
              AND COALESCE(e.obsId, '') = COALESCE(:obsId, '')
            """)
    Optional<Event> findByNaturalKey(@Param("evtType") String evtType,
                                     @Param("evtId") String evtId,
                                     @Param("net") String net,
                                     @Param("obsId") String obsId);

    /**
     * 지금까지 적재한 것 중 가장 늦은 업체 등록시각. 다음 증분 조회의 시작점이다.
     *
     * <p>별도 커서 테이블을 두지 않는다 — 적재된 데이터 자체가 진행 상태라, 커서만 어긋나
     * 이벤트를 건너뛰는 사고가 생기지 않는다.
     */
    @Query("SELECT MAX(e.sourceRegdate) FROM Event e")
    Optional<LocalDateTime> findLatestSourceRegdate();
}
