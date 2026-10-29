package com.eseict.ulsan.server.collector;

import com.eseict.ulsan.server.domain.Snapshot;
import com.eseict.ulsan.server.entity.Server;

import java.util.Optional;

/**
 * 수집기 하나의 계약. 서버 한 대를 받아 스냅샷 하나를 내놓거나(Optional.of) 담당이 아니면 비운다(Optional.empty).
 * 새 수집 방식이 생기면 이 인터페이스를 구현해 @Component 로 등록하면 스케줄러가 알아서 돈다.
 */
public interface CollectorPort {

    /** 이 수집기가 이 서버를 맡는가. */
    boolean supports(Server server);

    /** 측정. 실패하면 예외 대신 Optional.empty — 한 대의 실패가 나머지 12대를 막지 않는다. */
    Optional<Snapshot> collect(Server server);

    String name();
}
