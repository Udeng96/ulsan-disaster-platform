package kr.ulsan.broadcast.commlog;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;

/** 통신 로그 저장 + 1개월 지난 로그 삭제. */
@Service
public class CommLogService {

    private static final Logger log = LoggerFactory.getLogger(CommLogService.class);

    private final CommLogRepository repository;
    private final Clock clock;

    public CommLogService(CommLogRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    public CommLog save(CommLog commLog) {
        return repository.save(commLog);
    }

    /** 매일 새벽 1시, 1개월 지난 통신 로그를 삭제한다. */
    @Scheduled(cron = "0 0 1 * * *", zone = "Asia/Seoul")
    @Transactional
    public void purgeOldLogs() {
        LocalDateTime before = LocalDateTime.now(clock).minusMonths(1);
        int deleted = repository.deleteOlderThan(before);
        log.info("통신 로그 정리: {} 이전 {}건 삭제", before, deleted);
    }
}
