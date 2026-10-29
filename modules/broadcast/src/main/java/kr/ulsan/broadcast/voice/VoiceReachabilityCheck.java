package kr.ulsan.broadcast.voice;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.net.InetSocketAddress;
import java.net.Socket;

/**
 * 기동 시 자동음성 업체(host:port)에 <b>TCP 연결만</b> 시도해 도달성을 로그로 남긴다.
 *
 * <p>연결 후 <b>데이터를 보내지 않고 즉시 닫으므로</b> 실제 방송과 무관하다(도달성 확인만).
 * {@code host} 가 없으면(개발/mock) 건너뛴다 → 운영(host 설정)에서만 실제로 확인된다.
 */
@Component
public class VoiceReachabilityCheck {

    private static final Logger log = LoggerFactory.getLogger(VoiceReachabilityCheck.class);

    private final VoiceProperties props;

    public VoiceReachabilityCheck(VoiceProperties props) {
        this.props = props;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void checkOnStartup() {
        String host = props.getHost();
        int port = props.getPort();
        if (host == null || host.isBlank()) {
            log.info("음성 도달성 확인 건너뜀 — host 미설정(개발/mock)");
            return;
        }
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), props.getTimeoutMs());
            log.info("음성 도달성 OK — {}:{} 연결 성공(데이터 미전송, 도달성만 확인)", host, port);
        } catch (Exception e) {
            log.warn("음성 도달성 실패 — {}:{} 연결 불가: {}", host, port, e.getMessage());
        }
    }
}
