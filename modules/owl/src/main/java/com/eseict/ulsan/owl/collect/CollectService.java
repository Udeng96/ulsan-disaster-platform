package com.eseict.ulsan.owl.collect;

import com.eseict.ulsan.owl.collect.dto.CollectedMessage;
import com.eseict.ulsan.owl.ingest.OwlMessageClient;
import com.eseict.ulsan.owl.ingest.RegionFilter;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * 최근 부엉이 메시지 목록을 들고 있다가 내부망 요청에 바로 응답한다.
 *
 * <p>상황전파시스템은 조회 주기를 제한하므로(사용신청서: 5분) 조회는 {@link OwlRefreshScheduler}
 * 가 그 주기로만 {@link #refresh()} 를 부른다. {@code GET /owl/collect} 는 부엉이를 부르지 않고
 * 마지막 조회 결과({@link #latest()})를 돌려준다 — 그래서 내부망은 원하는 만큼 자주 물어도 된다.
 *
 * <p>목록은 매 조회마다 통째로 바꾼다(어제~오늘 관내 건 전체). 지우거나 쌓지 않으므로 응답이
 * 중간에 끊겨도 다음 요청에 같은 건이 다시 간다. 중복은 내부망이 {@code (msgId, msgSn)} 으로 거른다.
 * 조회가 실패하면 직전 목록을 그대로 둔다.
 */
@Service
@RequiredArgsConstructor
public class CollectService {

    private static final Logger log = LoggerFactory.getLogger(CollectService.class);

    private final OwlMessageClient client;
    private final AddressEnricher addressEnricher;
    private final RegionFilter regionFilter;

    private volatile List<CollectedMessage> latest = List.of();

    /** 마지막 조회 결과. 기동 직후 첫 조회가 끝나기 전에는 빈 목록. */
    public List<CollectedMessage> latest() {
        return latest;
    }

    /** 부엉이를 조회해 목록을 바꾼다. 실패하면 직전 목록 유지. */
    public void refresh() {
        try {
            OwlMessageClient.Result result = client.fetch();
            latest = result.targets().stream()
                    .map(OwlMessageMapper::toCollected)
                    .map(addressEnricher::enrich)
                    .toList();
            log.info("[OWL EVENT] SUCCESS - 전체 {} 건 / {} {} 건",
                    result.total(), regionFilter.sigungu(), latest.size());
        } catch (Exception e) {
            log.error("[OWL EVENT] FAIL - {}", e.getMessage() != null ? e.getMessage() : e.toString());
        }
    }
}
