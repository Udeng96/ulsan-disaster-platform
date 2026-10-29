package kr.ulsan.broadcast.voice.template;

/** 없는 문구 id → 404. */
public class MessageTemplateNotFoundException extends RuntimeException {

    public MessageTemplateNotFoundException(Long id) {
        super("문구가 없습니다: " + id);
    }
}
