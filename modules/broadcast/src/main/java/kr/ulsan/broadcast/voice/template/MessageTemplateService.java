package kr.ulsan.broadcast.voice.template;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 자동음성 문구 목록·추가·수정·삭제. 추가·수정·삭제는 {@code [TEMPLATE]} 로그(voice.log)를 남긴다.
 * 태블릿·상황판에서 수정을 막는 것은 화면이 한다(서버 권한 검사 없음).
 */
@Service
@Transactional(readOnly = true)
public class MessageTemplateService {

    private static final Logger log = LoggerFactory.getLogger(MessageTemplateService.class);

    private final MessageTemplateRepository templates;
    private final Clock clock;

    public MessageTemplateService(MessageTemplateRepository templates, Clock clock) {
        this.templates = templates;
        this.clock = clock;
    }

    public List<MessageTemplateResponse> list() {
        return templates.findAllByOrderByIdAsc().stream().map(MessageTemplateResponse::from).toList();
    }

    @Transactional
    public MessageTemplateResponse create(MessageTemplateRequest request) {
        MessageTemplate saved = templates.save(new MessageTemplate(request.title(), request.content(), LocalDateTime.now(clock)));
        log.info("[TEMPLATE] 추가 {} {}", saved.getId(), saved.getTitle());
        return MessageTemplateResponse.from(saved);
    }

    @Transactional
    public MessageTemplateResponse update(Long id, MessageTemplateRequest request) {
        MessageTemplate template = templates.findById(id).orElseThrow(() -> new MessageTemplateNotFoundException(id));
        template.update(request.title(), request.content(), LocalDateTime.now(clock));
        log.info("[TEMPLATE] 수정 {} {}", id, request.title());
        return MessageTemplateResponse.from(template);
    }

    @Transactional
    public void delete(Long id) {
        MessageTemplate template = templates.findById(id).orElseThrow(() -> new MessageTemplateNotFoundException(id));
        templates.delete(template);
        log.info("[TEMPLATE] 삭제 {} {}", id, template.getTitle());
    }
}
