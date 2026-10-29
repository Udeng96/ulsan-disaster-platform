package kr.ulsan.broadcast;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 모듈 공통 설정 ({@code broadcast.*}). 동작 모드를 담는다.
 */
@ConfigurationProperties(prefix = "broadcast")
public class BroadcastProperties {

    /** 동작 모드. 미설정 시 {@link BroadcastMode#BLOCKED}(안전). */
    private BroadcastMode mode = BroadcastMode.BLOCKED;

    public BroadcastMode getMode() {
        return mode;
    }

    public void setMode(BroadcastMode mode) {
        this.mode = mode;
    }

    /** 실제 출력(전광판 전송·음성 송신)을 하는 모드인지. (REAL 또는 TEST) */
    public boolean isOutputEnabled() {
        return mode != BroadcastMode.BLOCKED;
    }
}
