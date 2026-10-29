package com.eseict.ulsan.slope.ledger;

import com.eseict.ulsan.slope.ledger.dto.LedgerItem;
import com.eseict.ulsan.slope.ledger.dto.LedgerPage;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * 안전데이터 급경사지 목록(DSSP-IF-10158) 조회 클라이언트.
 *
 * <p><b>서버측 필터가 없다.</b> {@code STDG_CD_1} / {@code SCAR_MNG_NO} 등을 파라미터로 넣어도
 * 전체 건수가 그대로 내려온다(확인 완료). 그래서 전 페이지를 받아 법정동코드로 걸러낸다.
 *
 * <p>연속 호출하면 서버가 연결을 끊으므로 페이지 사이에 {@code request-delay-ms} 만큼 쉬고,
 * 실패 시 지수 백오프로 재시도한다.
 */
@Slf4j
@Component
public class LedgerClient {

    private final LedgerSyncProperties props;
    private final RestClient rest;

    public LedgerClient(LedgerSyncProperties props, RestClient.Builder builder) {
        this.props = props;
        this.rest = builder.build();
    }

    /** 급경사지 전 페이지를 훑어 설정된 지역(법정동코드 prefix)에 속한 것만 반환. */
    public List<LedgerItem> fetchManagedAreas() {
        LedgerPage first = fetchPage(1);
        int total = first.totalCount() == null ? 0 : first.totalCount();
        int pages = (total + props.pageSize() - 1) / props.pageSize();
        log.info("급경사지 대장 조회 시작 — 전체 {}건 / {}페이지", total, pages);

        List<LedgerItem> region = new ArrayList<>();
        int received = 0;
        for (int p = 1; p <= pages; p++) {
            LedgerPage page = (p == 1) ? first : fetchPage(p);
            List<LedgerItem> items = page.items();
            received += items.size();
            items.stream()
                    .filter(i -> i.legalDongCode() != null
                            && i.legalDongCode().startsWith(props.regionCode()))
                    .forEach(region::add);
            sleep(props.requestDelayMs());
        }
        log.info("급경사지 대장 조회 완료 — 수신 {}건 / 지역({}) {}건", received, props.regionCode(), region.size());
        return region;
    }

    private LedgerPage fetchPage(int pageNo) {
        RuntimeException last = null;
        for (int attempt = 1; attempt <= props.maxRetries(); attempt++) {
            try {
                LedgerPage page = rest.get()
                        .uri(props.baseUrl() + "?serviceKey={key}&pageNo={p}&numOfRows={n}&returnType=json",
                                props.serviceKey(), pageNo, props.pageSize())
                        .retrieve()
                        .body(LedgerPage.class);
                if (page == null || !page.isOk()) {
                    throw new IllegalStateException("응답 오류: " + (page == null ? "null" : page.header()));
                }
                return page;
            } catch (RuntimeException e) {
                last = e;
                log.warn("페이지 {} 조회 실패 ({}/{}) — {}", pageNo, attempt, props.maxRetries(), e.getMessage());
                sleep(1000L * attempt);
            }
        }
        throw new IllegalStateException("페이지 " + pageNo + " 조회 실패", last);
    }

    private void sleep(long ms) {
        if (ms <= 0) {
            return;
        }
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("조회 중단", e);
        }
    }
}
