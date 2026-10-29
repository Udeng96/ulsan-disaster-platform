package com.eseict.ulsan.server.firewall.syslog;

import com.eseict.ulsan.server.firewall.FirewallProperties;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Syslog 파일을 오프셋부터 읽어 새 줄만 fw_log 에 넣는다. 로테이션으로 파일이 작아지면 처음부터. */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "firewall.syslog", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
public class FirewallSyslogTailer {

    private final FirewallProperties props;
    private final FwLogRepository logRepository;
    private final FwLogOffsetRepository offsetRepository;

    @Scheduled(fixedDelayString = "${firewall.syslog.interval-ms}")
    @Transactional
    public void tail() {
        Path path = Path.of(props.syslog().path());
        if (!Files.exists(path)) {
            log.warn("[firewall] syslog 파일 없음: {}", path);
            return;
        }
        FwLogOffset offset = offsetRepository.findById(path.toString())
                .orElseGet(() -> initialOffset(path));
        try (RandomAccessFile raf = new RandomAccessFile(path.toFile(), "r")) {
            long size = raf.length();
            long from = offset.getFileOffset();
            if (size < from) {
                log.info("[firewall] syslog 로테이션 감지, 처음부터 읽음 (size={} < offset={})", size, from);
                from = 0;
            }
            raf.seek(from);
            List<FwLog> batch = new ArrayList<>();
            String line;
            long consumed = from;
            while ((line = raf.readLine()) != null) {
                String text = new String(line.getBytes(StandardCharsets.ISO_8859_1), StandardCharsets.UTF_8);
                consumed = raf.getFilePointer();
                if (text.isBlank()) continue;
                FirewallSyslogParser.parse(text).ifPresentOrElse(batch::add,
                        () -> log.debug("[firewall] syslog 형식 불일치: {}", text));
            }
            if (!batch.isEmpty()) {
                logRepository.saveAll(batch);
                log.debug("[firewall] syslog {}줄 저장", batch.size());
            }
            offset.update(consumed);
            offsetRepository.save(offset);
        } catch (IOException e) {
            log.warn("[firewall] syslog 읽기 실패: {}", e.getMessage());
        }
    }

    /** 처음 붙을 때는 파일 끝부터. 과거분까지 다 넣으면 첫 기동에서 수만 줄이 들어온다. */
    private FwLogOffset initialOffset(Path path) {
        long end = path.toFile().length();
        log.info("[firewall] syslog 최초 시작, 파일 끝({} bytes)부터 읽음", end);
        return new FwLogOffset(path.toString(), end);
    }
}
