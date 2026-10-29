package com.eseict.ulsan.slope.alarm;

import com.eseict.ulsan.slope.common.TtlCache;
import java.time.Duration;
import java.util.List;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;

/**
 * 발령 필요 캐시. (발령 이력은 우리 DB 의 단계 이력(area_level_event)을 읽어 캐시하지 않는다.)
 *
 * <p><b>왜 필요한가</b> — 관제센터 20여 대가 각자 1분마다 같은 화면을 조회하는데, 이 조회는
 * <b>망연계 너머의 업체 DB</b>를 읽는다. 캐시를 두면 <b>화면이 몇 대든 분당 1회</b>로 고정된다.
 *
 * <p>TTL 1분은 화면 폴링 주기와 같다. 업체 조회가 실패하면 마지막 성공 값을 준다
 * ({@link TtlCache}). 지역 탭({@code /api/areas})과 발령 필요 목록이 같은 값을 공유한다.
 */
@Component
public class AlarmCache {

    private final TtlCache<String, List<?>> cache = new TtlCache<>(Duration.ofMinutes(1));

    @SuppressWarnings("unchecked")
    public <T> List<T> pending(Supplier<List<T>> loader) {
        return (List<T>) cache.get("pending", loader::get);
    }
}
