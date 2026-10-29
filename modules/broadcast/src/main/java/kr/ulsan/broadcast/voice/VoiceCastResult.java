package kr.ulsan.broadcast.voice;

import com.fasterxml.jackson.annotation.JsonIgnore;

/**
 * TTS 방송 실행 요청에 대한 업체 접수 결과.
 *
 * @param accepted      접수 성공 여부 (RESULT MESSG 가 OK 인지). blocked 모드는 true.
 * @param castId        업체가 발급한 방송 ID. 실패·blocked 면 null.
 * @param resultMessage 업체 응답 원문 (OK / NOK(사유))
 * @param exchange      주고받은 전문 (통신 로그용, 응답 JSON 에서 제외)
 * @param blocked       blocked 모드라 실제로 보내지 않았는지 (이력 BLOCKED 저장용, 응답 JSON 에서 제외)
 */
public record VoiceCastResult(boolean accepted, String castId, String resultMessage,
                              @JsonIgnore VoiceExchange exchange, @JsonIgnore boolean blocked) {

    public VoiceCastResult(boolean accepted, String castId, String resultMessage, VoiceExchange exchange) {
        this(accepted, castId, resultMessage, exchange, false);
    }

    public VoiceCastResult(boolean accepted, String castId, String resultMessage) {
        this(accepted, castId, resultMessage, null, false);
    }
}
