package kr.ulsan.broadcast.signboard;

import java.util.List;

/**
 * 대시보드에 돌려주는 전광판 API 응답.
 *
 * @param status  "SUCCESS" 또는 오류 코드(예: "VALIDATION_ERROR")
 * @param message 성공 시 "<전광판> : <alert id>" 목록, 실패 시 오류 메시지 목록
 */
public record SignboardResponse(String status, List<String> message) {

    public static SignboardResponse success(List<String> message) {
        return new SignboardResponse("SUCCESS", message);
    }

    public static SignboardResponse error(String status, List<String> message) {
        return new SignboardResponse(status, message);
    }
}
