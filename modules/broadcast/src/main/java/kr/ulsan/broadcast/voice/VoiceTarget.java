package kr.ulsan.broadcast.voice;

/**
 * 방송 대상 단말 (업체 DEST LIST 항목).
 *
 * @param code  단말기 코드 → TERM CODE
 * @param name  지역명 → TERM NAME
 * @param phone 단말기 전화번호 → TERM CDMA ("012-9999-9999")
 */
public record VoiceTarget(String code, String name, String phone) {
}
