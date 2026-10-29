package kr.ulsan.broadcast.voice;

/** 자동음성 요청이 들어온 입구. 로그와 이력({@code voice_cast.source})에 남긴다. */
public enum VoiceSource {

    /** 화면(대시보드 경유). */
    SCREEN("화면"),
    /** CAP 변환 모듈. */
    CAP("CAP");

    private final String label;

    VoiceSource(String label) {
        this.label = label;
    }

    /** 로그에 찍는 이름. */
    public String label() {
        return label;
    }
}
