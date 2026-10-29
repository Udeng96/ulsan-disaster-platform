package kr.ulsan.broadcast.voice.template;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageTemplateRepository extends JpaRepository<MessageTemplate, Long> {

    List<MessageTemplate> findAllByOrderByIdAsc();
}
