package com.eseict.ulsan.server.host.live;

import com.eseict.ulsan.server.domain.Verdict;

/** 상세 ④ ⑤ ⑥ 화면 한 줄씩. 못 읽은 칸은 null (화면 「실측 대기」). */
public record HostDetail(String connectionText, Verdict connectionVerdict, String lastText, Verdict lastVerdict, String throughputText) {

    public static final HostDetail EMPTY = new HostDetail(null, null, null, null, null);

    /** ⑤ 한 줄 + 판정. */
    public record Service(String text, Verdict verdict) {}
}
