package kr.ulsan.broadcast.signboard;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 재난 전광판 설정 ({@code broadcast.signboard.*}). 전광판 목록은 DB {@code signboard_board} 에 있다.
 */
@ConfigurationProperties(prefix = "broadcast.signboard")
public class SignboardProperties {

    /**
     * 전광판 전송 주소. {@code {host}} 에 전광판, {@code {port}} 에 {@link #pushPort} 가 들어간다.
     * 운영은 내부 nginx 경유 주소(예: {@code http://192.0.2.179/bcast-board/{host}/PushEmergencyAlerts}).
     */
    private String pushUrl = "http://{host}:{port}/PushEmergencyAlerts";

    /** 전광판 수신 포트 ({@link #pushUrl} 의 {@code {port}}). */
    private int pushPort = 6892;

    /** 전광판 인증 key (요청 헤더 {@code key}). */
    private String apiKey = "";

    /** 모듈이 채우는 알림 값 ({@code broadcast.signboard.alert.*}). 화면은 내용·대상만 보낸다. */
    private final Alert alert = new Alert();

    public String getPushUrl() {
        return pushUrl;
    }

    public void setPushUrl(String pushUrl) {
        this.pushUrl = pushUrl;
    }

    public int getPushPort() {
        return pushPort;
    }

    public void setPushPort(int pushPort) {
        this.pushPort = pushPort;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public Alert getAlert() {
        return alert;
    }

    /** 모듈이 채우는 알림 값. 기본값은 gis 가 쓰던 남구 통합관제 값. */
    public static class Alert {

        /** identifier 앞부분. 뒤에 요청 시각 {@code yyyyMMddHHmmssSSS} 가 붙는다. */
        private String identifierPrefix = "KR-ULSAN-NAMGU-";
        /** 표출 시간(초). 전광판이 받은 시점부터 센다. */
        private int displayDuration = 1200;
        /** expires = 요청 시각 + 이 분. 전광판은 읽지 않는 참고용 값. */
        private int expiresMinutes = 20;
        /** critical|urgent|high|medium|low */
        private String priority = "urgent";
        private String subType = "긴급";
        private String rcptnRgnNm = "가상시설0565";
        private String agency = "울산남구청";

        public String getIdentifierPrefix() {
            return identifierPrefix;
        }

        public void setIdentifierPrefix(String identifierPrefix) {
            this.identifierPrefix = identifierPrefix;
        }

        public int getDisplayDuration() {
            return displayDuration;
        }

        public void setDisplayDuration(int displayDuration) {
            this.displayDuration = displayDuration;
        }

        public int getExpiresMinutes() {
            return expiresMinutes;
        }

        public void setExpiresMinutes(int expiresMinutes) {
            this.expiresMinutes = expiresMinutes;
        }

        public String getPriority() {
            return priority;
        }

        public void setPriority(String priority) {
            this.priority = priority;
        }

        public String getSubType() {
            return subType;
        }

        public void setSubType(String subType) {
            this.subType = subType;
        }

        public String getRcptnRgnNm() {
            return rcptnRgnNm;
        }

        public void setRcptnRgnNm(String rcptnRgnNm) {
            this.rcptnRgnNm = rcptnRgnNm;
        }

        public String getAgency() {
            return agency;
        }

        public void setAgency(String agency) {
            this.agency = agency;
        }
    }
}
