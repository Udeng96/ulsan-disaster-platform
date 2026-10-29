package kr.ulsan.broadcast.voice.history;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** 방송 대상 단말 ({@code voice_cast_target}). code·name·phone 은 보낸 시점 값 그대로. */
@Entity
@Table(name = "voice_cast_target")
public class VoiceCastTargetRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "voice_cast_id", nullable = false)
    private Long voiceCastId;

    @Column(name = "term_code", nullable = false, length = 20)
    private String termCode;

    @Column(name = "term_name", nullable = false, length = 200)
    private String termName;

    @Column(name = "term_phone", nullable = false, length = 30)
    private String termPhone;

    protected VoiceCastTargetRecord() {
    }

    public VoiceCastTargetRecord(Long voiceCastId, String termCode, String termName, String termPhone) {
        this.voiceCastId = voiceCastId;
        this.termCode = termCode;
        this.termName = termName;
        this.termPhone = termPhone;
    }

    public Long getId() {
        return id;
    }

    public Long getVoiceCastId() {
        return voiceCastId;
    }

    public String getTermCode() {
        return termCode;
    }

    public String getTermName() {
        return termName;
    }

    public String getTermPhone() {
        return termPhone;
    }
}
