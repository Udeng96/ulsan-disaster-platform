package kr.ulsan.broadcast.voice.template;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 자동음성 문구 ({@code GET·POST /api/broadcast/templates}, {@code PUT·DELETE /api/broadcast/templates/{id}}). */
@RestController
@RequestMapping("/api/broadcast/templates")
public class MessageTemplateController {

    private final MessageTemplateService service;

    public MessageTemplateController(MessageTemplateService service) {
        this.service = service;
    }

    @GetMapping
    public List<MessageTemplateResponse> list() {
        return service.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MessageTemplateResponse create(@Valid @RequestBody MessageTemplateRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public MessageTemplateResponse update(@PathVariable Long id, @Valid @RequestBody MessageTemplateRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
