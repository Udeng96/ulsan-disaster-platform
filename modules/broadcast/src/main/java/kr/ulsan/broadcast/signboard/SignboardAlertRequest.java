package kr.ulsan.broadcast.signboard;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

/**
 * 화면(대시보드)이 전달하는 전광판 알림 1건. 요청은 한 번에 알림 하나.
 * 화면은 내용과 대상만 보내고, 나머지 전광판 규격 값(identifier·timestampKR·displayDuration 등)은
 * 모듈이 채운다({@code broadcast.signboard.alert.*}).
 *
 * @param msgCn       표시 본문 (필수) → MSG_CN
 * @param targetHosts 대상 전광판 목록 (선택, 없으면 전체) → targetHosts
 */
public record SignboardAlertRequest(
        @NotBlank(message = "비어 있으면 안 됩니다") String msgCn,
        List<String> targetHosts
) {
}
