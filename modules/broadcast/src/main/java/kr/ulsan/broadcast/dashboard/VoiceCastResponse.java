package kr.ulsan.broadcast.dashboard;

import kr.ulsan.broadcast.voice.VoiceCastResult;

/**
 * 화면에 돌려주는 자동음성 응답. 전광판 응답과 같은 {@code status}/{@code message} 모양.
 *
 * @param status  SUCCESS / FAIL
 * @param message 실패 사유 (업체 거부·통신 실패), blocked 표시. 정상 성공이면 없음.
 */
public record VoiceCastResponse(String status, String message) {

    static final String SUCCESS = "SUCCESS";
    static final String FAIL = "FAIL";

    /** 업체 응답(OK/NOK) 또는 blocked 결과 → 응답. */
    static VoiceCastResponse from(VoiceCastResult result) {
        if (result.blocked()) {
            return new VoiceCastResponse(SUCCESS, result.resultMessage());
        }
        if (result.accepted()) {
            return new VoiceCastResponse(SUCCESS, null);
        }
        return new VoiceCastResponse(FAIL, "업체 거부: " + result.resultMessage());
    }

    /** 업체 통신 실패 → 응답 (HTTP 502). */
    static VoiceCastResponse fail(String message) {
        return new VoiceCastResponse(FAIL, message);
    }
}
