package com.eseict.ulsan.owl.ingest;

import com.eseict.ulsan.owl.ingest.OwlListClient.ListItem;
import com.eseict.ulsan.owl.ingest.dto.OwlRawMessage;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 부엉이 조회 한 번 — 목록 → 관내 판별 → 관내 건만 상세.
 *
 * <p>전건 상세조회는 연속 호출이 되어 차단을 부르므로, 목록의 위치명으로 먼저 거른다
 * (실측: 울산 발신 101건 중 남구 21건).
 */
@Component
@RequiredArgsConstructor
public class OwlMessageClient {

    private final OwlListClient listClient;
    private final OwlDetailClient detailClient;
    private final RegionFilter regionFilter;

    /** 목록 전체 건수와 관내 건의 상세. 목록 조회가 실패하면 예외. */
    public Result fetch() throws Exception {
        List<ListItem> list = listClient.fetch();

        List<OwlRawMessage> targets = new ArrayList<>();
        Set<String> keys = new HashSet<>();
        for (ListItem item : list) {
            if (!regionFilter.isTarget(item.dolcNm())) {
                continue;
            }
            keys.add(item.key());
            OwlRawMessage detail = detailClient.get(item.msgId(), item.msgSn());
            if (detail != null) {
                targets.add(detail);
            }
        }
        detailClient.retainOnly(keys);
        return new Result(list.size(), targets);
    }

    public record Result(int total, List<OwlRawMessage> targets) {
    }
}
