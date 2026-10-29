package com.eseict.ulsan.slope.ingest;

import com.eseict.ulsan.slope.alarm.AreaLevelBackfill;
import com.eseict.ulsan.slope.alarm.AreaLevelTracker;
import com.eseict.ulsan.slope.facility.SlopeAreaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 수집 스케줄.
 *
 * <p>화면 값(현재값·차트·임계선·발령 필요)은 업체 DB 를 직접 읽으므로(2026-09-30) 여기서 옮겨
 * 담는 것은 두 가지뿐이다.
 * <ul>
 *   <li><b>마스터 자정</b> — 급경사지 3, 계측기 48, 관측항목 70. 거의 바뀌지 않는다. 업체 id 를
 *       우리 id·표시 이름에 잇는 데 쓴다.</li>
 *   <li><b>단계 이력 1분</b> — 업체 측정 주기가 1분이라 더 짧게 해도 새 판정이 없다
 *       ({@link AreaLevelTracker}).</li>
 * </ul>
 *
 * <p>모든 작업이 예외를 삼킨다. 업체 DB 는 망연계 너머라 끊길 수 있는데, 한 번 실패했다고
 * 스케줄러가 멈추면 복구된 뒤에도 안 돈다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "slope", name = {"vendor.enabled", "ingest.enabled"},
        havingValue = "true", matchIfMissing = true)
public class IngestScheduler {

    private final MetaSyncService metaSync;
    private final AreaLevelTracker levelTracker;
    private final AreaLevelBackfill levelBackfill;
    private final SlopeAreaRepository areaRepository;

    /** 이력이 비어 있을 때 지난 기간 다시 채우기를 마쳤는지. 끝나기 전에는 매분 기록을 하지 않는다. */
    private boolean historyReady;

    /** 기동 직후 1회. 마스터가 비어 있으면 단계 이력이 지구를 찾지 못하므로 먼저 채운다. */
    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        run("마스터 동기화", metaSync::sync);
    }

    /**
     * 단계 이력.
     *
     * <p>마스터가 비어 있으면 먼저 채운다. 기동 시점에 업체 DB 가 닿지 않으면(망연계 장애,
     * 권한 문제) 시작 동기화가 실패하는데, 자정까지 기다리지 않고 복구되는 즉시 이어가려면
     * 여기서 확인해야 한다.
     *
     * <p>이력이 비어 있으면 매분 기록 전에 지난 기간을 먼저 채운다({@link AreaLevelBackfill}). 같은
     * 스케줄 스레드에서 차례로 돌려야 두 쪽이 한 지구에 진행 중인 구간을 각각 만들지 않는다.
     * 실패하면 다음 분에 다시 시도한다.
     */
    @Scheduled(cron = "0 * * * * *")
    public void syncLevels() {
        if (areaRepository.count() == 0) {
            run("마스터 동기화(지연)", metaSync::sync);
        }
        if (!historyReady) {
            run("단계 이력 다시 채우기", () -> {
                levelBackfill.runIfEmpty();
                historyReady = true;
            });
            if (!historyReady) {
                return;
            }
        }
        run("단계 이력", levelTracker::sync);
    }

    @Scheduled(cron = "0 0 0 * * *")
    public void syncMeta() {
        run("마스터 동기화", metaSync::sync);
    }

    private void run(String name, Runnable task) {
        try {
            task.run();
        } catch (Exception e) {
            log.error("{} 실패 — {}", name, e.getMessage());
        }
    }
}
