package com.eseict.ulsan.earthquake.event;

import java.time.LocalDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 업체 이벤트를 우리 DB 에 적재한다.
 *
 * <p><b>멱등하다.</b> 자연키({@code evt_type}+{@code evt_id}+{@code net}+{@code obs_id})로 찾아
 * 있으면 덮어쓰고 없으면 넣는다 — 업체 쪽에서 값이 갱신될 수 있고, 같은 구간을 다시 읽어도
 * 중복이 쌓이면 안 된다.
 *
 * <p>스케줄러({@link EventCollector})와 분리한 이유는 트랜잭션이다. 같은 클래스 안에서
 * 호출하면 프록시를 타지 않아 {@code @Transactional} 이 걸리지 않는다.
 */
@Service
@ConditionalOnProperty(prefix = "earthquake.event", name = "polling", havingValue = "true")
@RequiredArgsConstructor
public class EventIngestService {

    private final EventReader reader;
    private final EventRepository repository;
    private final EventProperties properties;

    /**
     * 증분 적재.
     *
     * <p>조회가 {@code regdate >= 마지막 적재시각} 이라 경계의 행은 매 주기 다시 읽힌다.
     * 그래서 읽은 건수가 아니라 <b>새로 넣은 건수</b>를 돌려준다 — 읽은 건수를 쓰면 새 이벤트가
     * 없어도 매분 "1건 적재" 로그가 찍힌다.
     *
     * @return 새로 적재한 건수 (종류별)
     */
    @Transactional
    public Result ingest() {
        LocalDateTime since = repository.findLatestSourceRegdate()
                .orElseGet(properties::initialSinceOrEpoch);

        int kma = 0;
        int local = 0;
        for (EventRow row : reader.findRegisteredAfter(since)) {
            Optional<Event> existing =
                    repository.findByNaturalKey(row.evtType(), row.evtId(), row.net(), row.obsId());
            if (existing.isPresent()) {
                existing.get().apply(row);   // 영속 상태 — 커밋 시 반영
                continue;
            }
            repository.save(Event.from(row));
            if ("K".equals(row.evtType())) {
                kma++;
            } else {
                local++;   // H. 업체가 다른 종류를 추가하면 여기에 함께 센다
            }
        }
        return new Result(kma, local);
    }

    /**
     * 새로 적재한 건수.
     *
     * @param kma   기상청 통보 ({@code K})
     * @param local 현장 트리거 ({@code H})
     */
    public record Result(int kma, int local) {
        public int total() {
            return kma + local;
        }
    }
}
