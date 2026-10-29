package kr.ulsan.broadcast.dashboard;

import java.util.List;

/**
 * 대시보드가 보내는 자동음성 방송 실행 요청. 필수값·길이(제목 64자, 내용 2000자) 검사는 화면에서 한다.
 *
 * @param title      방송 제목 → CAST TITLE
 * @param content    방송 내용 → CAST BODY
 * @param alertSound 알림벨. 대시보드 값 "재난"/"기본"/"없음"(또는 코드 "0"/"1"/"9").
 *                   모듈이 업체 CHIME YN 코드로 변환. 생략 시 서버 설정 기본값.
 * @param targets    방송 대상 단말 목록
 */
public record VoiceCastRequest(
        String title,
        String content,
        String alertSound,
        List<Target> targets
) {
    /**
     * 방송 대상 단말.
     *
     * @param code  단말기 코드 → TERM CODE
     * @param name  지역명 → TERM NAME
     * @param phone 단말기 전화번호 → TERM CDMA
     */
    public record Target(
            String code,
            String name,
            String phone
    ) {
    }
}
