package kr.ulsan.broadcast.voice;

import java.util.List;

/**
 * 자동음성 업체 연동 게이트웨이.
 *
 * <p>REAL/TEST 모드는 실제 TCP 전송({@link VoiceClient}), BLOCKED 모드는 전송 없이 성공 반환
 * ({@link MockVoiceGateway}). {@code broadcast.mode} 설정으로 둘 중 하나만 빈으로 등록된다.
 */
public interface VoiceGateway {

    /** TTS 방송 실행. */
    VoiceCastResult cast(String title, String content, String alertSound, List<VoiceTarget> targets);
}
