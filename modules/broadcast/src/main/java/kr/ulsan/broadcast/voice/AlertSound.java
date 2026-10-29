package kr.ulsan.broadcast.voice;

/**
 * 알림음. 화면 값("기본"/"재난"/"없음") 또는 업체 코드("0"/"1"/"9")를 받아
 * 업체 CHIME YN 코드와 이력 저장값({@code voice_cast.alert_sound})으로 바꾼다.
 */
public enum AlertSound {

    DEFAULT("0", "기본"),
    DISASTER("1", "재난"),
    NONE("9", "없음");

    private final String chimeYn;
    private final String label;

    AlertSound(String chimeYn, String label) {
        this.chimeYn = chimeYn;
        this.label = label;
    }

    /** 업체 CHIME YN 코드. */
    public String chimeYn() {
        return chimeYn;
    }

    /** 화면 값 또는 코드 → 알림음. 모르는 값이면 null. */
    public static AlertSound from(String value) {
        if (value == null) {
            return null;
        }
        String v = value.trim();
        for (AlertSound s : values()) {
            if (s.chimeYn.equals(v) || s.label.equals(v)) {
                return s;
            }
        }
        return null;
    }

    /** 값이 없거나 모르는 값이면 기본 코드({@code broadcast.voice.chime-yn})로. */
    public static AlertSound resolve(String value, String defaultChimeYn) {
        AlertSound s = from(value);
        if (s != null) {
            return s;
        }
        AlertSound d = from(defaultChimeYn);
        return d != null ? d : DEFAULT;
    }
}
