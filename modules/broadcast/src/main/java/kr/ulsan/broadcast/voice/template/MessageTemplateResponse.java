package kr.ulsan.broadcast.voice.template;

/** 문구 1건. 항목은 gis 응답과 같다. */
public record MessageTemplateResponse(Long id, String title, String content) {

    public static MessageTemplateResponse from(MessageTemplate t) {
        return new MessageTemplateResponse(t.getId(), t.getTitle(), t.getContent());
    }
}
