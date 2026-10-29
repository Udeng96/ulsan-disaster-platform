package kr.ulsan.broadcast.voice;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 자동음성 업체 연동 설정 ({@code broadcast.voice.*}).
 *
 * <p>host/port 는 업체 TCP 접속 대상이며, 운영에서는 DMZ 프록시 주소를 넣는다(개발은 업체 직접).
 * organ-code/user-id 는 업체 발급 인증값, 나머지는 방송 파라미터 기본값이다.
 */
@ConfigurationProperties(prefix = "broadcast.voice")
public class VoiceProperties {

    /** 업체(또는 DMZ 프록시) 접속 호스트. */
    private String host;
    /** 업체 접속 포트. 자동음성 규격 36302. */
    private int port = 36302;
    /** 연결/응답 타임아웃(ms). */
    private int timeoutMs = 5000;

    /** 기관코드 varchar(6). 업체 발급. */
    private String organCode;
    /** 사용자 ID varchar(12). 업체 발급. */
    private String userId;

    /** 앞 묵음 "01"~"09". */
    private String preSilence = "03";
    /** 뒤 묵음 "01"~"09". */
    private String pstSilence = "03";
    /** 읽기 속도 "01"~"03". */
    private String readSpeed = "02";
    /** 본문 반복 횟수 "01"~"03". */
    private String repetitions = "01";
    /** 방송 음량 "01"~"09". */
    private String castVolume = "06";
    /** 알림벨 기본값 "0"-기본/"1"-재난/"9"-없음. 요청에 chime 이 없을 때 사용. */
    private String chimeYn = "0";

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public int getPort() {
        return port;
    }

    public void setPort(int port) {
        this.port = port;
    }

    public int getTimeoutMs() {
        return timeoutMs;
    }

    public void setTimeoutMs(int timeoutMs) {
        this.timeoutMs = timeoutMs;
    }

    public String getOrganCode() {
        return organCode;
    }

    public void setOrganCode(String organCode) {
        this.organCode = organCode;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getPreSilence() {
        return preSilence;
    }

    public void setPreSilence(String preSilence) {
        this.preSilence = preSilence;
    }

    public String getPstSilence() {
        return pstSilence;
    }

    public void setPstSilence(String pstSilence) {
        this.pstSilence = pstSilence;
    }

    public String getReadSpeed() {
        return readSpeed;
    }

    public void setReadSpeed(String readSpeed) {
        this.readSpeed = readSpeed;
    }

    public String getRepetitions() {
        return repetitions;
    }

    public void setRepetitions(String repetitions) {
        this.repetitions = repetitions;
    }

    public String getCastVolume() {
        return castVolume;
    }

    public void setCastVolume(String castVolume) {
        this.castVolume = castVolume;
    }

    public String getChimeYn() {
        return chimeYn;
    }

    public void setChimeYn(String chimeYn) {
        this.chimeYn = chimeYn;
    }
}
