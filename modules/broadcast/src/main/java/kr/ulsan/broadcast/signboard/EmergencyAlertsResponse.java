package kr.ulsan.broadcast.signboard;

import java.util.List;

/**
 * 전광판으로 보내는 push 본문({@code POST /PushEmergencyAlerts}). 새 알림은 1건을 담아 보내고,
 * test 모드 비우기는 {@code count:0, list:[]} 로 보낸다.
 */
public record EmergencyAlertsResponse(
        boolean success,
        String timestamp,
        int count,
        List<EmergencyAlert> list
) {
    static EmergencyAlertsResponse of(String timestamp, List<EmergencyAlert> list) {
        return new EmergencyAlertsResponse(true, timestamp, list.size(), list);
    }
}
