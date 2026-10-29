package kr.ulsan.broadcast.voice;

/**
 * 업체와 주고받은 전문 1건. 통신 로그({@code comm_log}) 저장에 쓴다.
 *
 * @param peer         상대 주소 (host:port, mock 이면 "mock")
 * @param requestWord  전문 종류 (REQUEST WORD)
 * @param requestBody  보낸 원문
 * @param responseBody 받은 원문. 응답을 못 받았으면 null.
 * @param elapsedMs    소요 시간(ms)
 * @param error        실패 사유. 성공이면 null.
 */
public record VoiceExchange(
        String peer,
        String requestWord,
        String requestBody,
        String responseBody,
        long elapsedMs,
        String error
) {
    public boolean success() {
        return error == null;
    }
}
