package kr.ulsan.broadcast.voice;

/** 업체 TCP 통신/응답 처리 실패. 실패한 전문({@link VoiceExchange})을 함께 담는다. */
public class VoiceException extends RuntimeException {

    private final transient VoiceExchange exchange;

    public VoiceException(String message) {
        this(message, null, null);
    }

    public VoiceException(String message, Throwable cause) {
        this(message, cause, null);
    }

    public VoiceException(String message, Throwable cause, VoiceExchange exchange) {
        super(message, cause);
        this.exchange = exchange;
    }

    /** 실패한 전문. 전송 전 실패(직렬화 등)면 null. */
    public VoiceExchange exchange() {
        return exchange;
    }
}
