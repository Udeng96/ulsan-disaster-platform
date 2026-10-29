package kr.ulsan.broadcast.voice.history;

import kr.ulsan.broadcast.commlog.CommLog;
import kr.ulsan.broadcast.commlog.CommLogService;
import kr.ulsan.broadcast.voice.AlertSound;
import kr.ulsan.broadcast.voice.VoiceCastResult;
import kr.ulsan.broadcast.voice.VoiceException;
import kr.ulsan.broadcast.voice.VoiceExchange;
import kr.ulsan.broadcast.voice.VoiceProperties;
import kr.ulsan.broadcast.voice.VoiceSource;
import kr.ulsan.broadcast.voice.VoiceTarget;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 자동음성 이력({@code voice_cast}·{@code voice_cast_target})과
 * 통신 로그({@code comm_log}) 저장.
 *
 * <p>방송은 이미 나간 뒤이므로 <b>저장 실패는 예외를 던지지 않고 error 로그만 남긴다.</b>
 */
@Service
public class VoiceHistoryService {

    private static final Logger log = LoggerFactory.getLogger(VoiceHistoryService.class);

    static final String ACCEPTED = "ACCEPTED";
    static final String REJECTED = "REJECTED";
    static final String FAILED = "FAILED";
    static final String BLOCKED = "BLOCKED";

    private static final String REF_CAST = "voice_cast";

    private final VoiceCastRepository casts;
    private final VoiceCastTargetRepository castTargets;
    private final CommLogService commLogs;
    private final VoiceProperties props;
    private final TransactionTemplate tx;
    private final Clock clock;

    public VoiceHistoryService(VoiceCastRepository casts, VoiceCastTargetRepository castTargets,
                               CommLogService commLogs,
                               VoiceProperties props, PlatformTransactionManager txManager, Clock clock) {
        this.casts = casts;
        this.castTargets = castTargets;
        this.commLogs = commLogs;
        this.props = props;
        this.tx = new TransactionTemplate(txManager);
        this.clock = clock;
    }

    /** 업체가 응답한 방송(OK → ACCEPTED, NOK → REJECTED). blocked 모드면 BLOCKED. */
    public void saveCast(VoiceSource source, String title, String content, String alertSound,
                         List<VoiceTarget> targets, VoiceCastResult result, LocalDateTime requestedAt) {
        String status = result.blocked() ? BLOCKED : result.accepted() ? ACCEPTED : REJECTED;
        save(source, title, content, alertSound, targets, status, result.castId(),
                result.resultMessage(), requestedAt, result.exchange());
    }

    /** 업체 통신 실패한 방송(FAILED). */
    public void saveFailedCast(VoiceSource source, String title, String content, String alertSound,
                               List<VoiceTarget> targets, VoiceException e, LocalDateTime requestedAt) {
        save(source, title, content, alertSound, targets, FAILED, null, e.getMessage(), requestedAt,
                e.exchange());
    }

    private void save(VoiceSource source, String title, String content, String alertSound,
                      List<VoiceTarget> targets, String status, String castId, String resultMessage,
                      LocalDateTime requestedAt, VoiceExchange exchange) {
        run("방송 이력", () -> {
            VoiceCastRecord cast = casts.save(new VoiceCastRecord(
                    source.name(), cut(nvl(title), 200), nvl(content),
                    AlertSound.resolve(alertSound, props.getChimeYn()).name(),
                    status, castId, cut(resultMessage, 200), requestedAt, LocalDateTime.now(clock)));
            for (VoiceTarget t : targets) {
                castTargets.save(new VoiceCastTargetRecord(cast.getId(), t.code(), t.name(), t.phone()));
            }
            saveCommLog(exchange, REF_CAST, cast.getId());
        });
    }

    private void saveCommLog(VoiceExchange ex, String refTable, Long refId) {
        if (ex == null) {
            return;   // 전송 전 실패(직렬화 등) — 남길 전문 없음
        }
        commLogs.save(new CommLog("VOICE", "OUT", "VENDOR", ex.peer(), ex.requestWord(),
                ex.requestBody(), ex.responseBody(), ex.success(), cut(ex.error(), 500),
                (int) ex.elapsedMs(), refTable, refId, LocalDateTime.now(clock)));
    }

    /** 한 트랜잭션으로 저장. 실패해도 예외를 던지지 않는다. */
    private void run(String what, Runnable work) {
        try {
            tx.executeWithoutResult(status -> work.run());
        } catch (Exception e) {
            log.error("{} 저장 실패 (방송 응답은 그대로 반환): {}", what, e.getMessage(), e);
        }
    }

    /** 화면이 값을 비워 보내도 이력은 남기도록 (title·content 는 NOT NULL). */
    private static String nvl(String s) {
        return s == null ? "" : s;
    }

    private static String cut(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }
}
