package com.eseict.ulsan.slope.ledger;

import com.eseict.ulsan.slope.facility.ManagedAreaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.Scheduled;

/**
 * 급경사지 관리대장 동기화 — 매일 자정.
 *
 * <p>{@code slope.ledger.polling=true} 일 때만 빈이 만들어진다. false 면 스케줄러 자체가
 * 등록되지 않아 외부 API 를 건드리지 않는다.
 *
 * <p><b>현재는 DB 를 읽어 비교만 하고 쓰지는 않는다</b> — 대장과 평가등급표 매칭이 아직
 * 정리되지 않아, API 값으로 덮어쓰면 수작업으로 보정한 좌표·행정동·기관/부서가 날아간다.
 * 반영할 건수만 로그로 남기고, 정리가 끝나면 이 클래스에 실제 반영 로직을 붙인다.
 *
 * <p>자정을 기다리지 않고 확인하려면 실행 인자로 cron 을 덮어쓴다:
 * {@code --slope.ledger.cron="0/30 * * * * *"}
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
@ConditionalOnProperty(name = "slope.ledger.polling", havingValue = "true")
public class LedgerSyncScheduler {

    private final LedgerClient client;
    private final ManagedAreaRepository repository;

    @Scheduled(cron = "${slope.ledger.cron}", zone = "${slope.ledger.zone}")
    public void sync() {
        try {
            LedgerDiff diff = LedgerDiff.of(repository.findAll(), client.fetchManagedAreas());
            log.info("대장 비교 — 추가 {}건 / 수정 {}건 / 삭제 {}건 (DB 반영은 하지 않음)",
                    diff.toAdd(), diff.toUpdate(), diff.toDelete());
        } catch (RuntimeException e) {
            // 외부 API 장애로 스케줄러가 죽지 않도록 여기서 삼킨다. 다음 자정에 다시 시도.
            log.error("급경사지 대장 동기화 실패 — {}", e.getMessage(), e);
        }
    }
}
