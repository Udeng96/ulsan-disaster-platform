package kr.ulsan.broadcast.signboard;

/**
 * 전광판 전송 시도 1번 (통신 로그 {@code comm_log} 1줄).
 *
 * @param peer         보낸 주소
 * @param requestBody  보낸 원문
 * @param responseBody 받은 원문 (통신 실패면 null)
 * @param success      성공 여부
 * @param error        실패 사유 (성공이면 null)
 * @param elapsedMs    걸린 시간
 */
public record PushAttempt(String peer, String requestBody, String responseBody, boolean success,
                          String error, long elapsedMs) {
}
