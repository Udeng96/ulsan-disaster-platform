package com.eseict.ulsan.slope.alarm;

import com.eseict.ulsan.slope.alarm.dto.AlarmHistory;
import com.eseict.ulsan.slope.alarm.dto.MonthlyCount;
import com.eseict.ulsan.slope.alarm.dto.PendingAlarm;
import com.eseict.ulsan.slope.alarm.dto.ZoneCount;
import com.eseict.ulsan.slope.facility.LevelName;
import com.eseict.ulsan.slope.facility.ObservationItem;
import com.eseict.ulsan.slope.facility.ObservationItemRepository;
import com.eseict.ulsan.slope.facility.SlopeArea;
import com.eseict.ulsan.slope.facility.SlopeAreaRepository;
import com.eseict.ulsan.slope.ingest.VendorReader;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 발령 조회. 업체 DB 를 직접 읽는다.
 *
 * <p>우리 DB 에 복제하지 않은 이유 — 발령은 드물게(2년간 4건) 일어나고 화면도 자주 보지
 * 않는다. 계측값처럼 매분 폴링할 대상이 아니라 복제 이득이 작다.
 *
 * <p><b>발령 이력은 {@code snr_isnc_log} 하나에서 온다.</b> 스피커·전광판 로그는 문구를
 * 표출했다는 송출 기록일 뿐이다 (2026-09-07 업체 답변). 그것으로 세면 발령 1건이 여러 건으로
 * 부풀어 실제와 어긋난다 — 2년간 발령 2건 / 송출 11건.
 *
 * <p>집계 규칙은 {@link AlarmRule} 에 모아두었다.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "slope.vendor.enabled", havingValue = "true")
public class AlarmReader {

    @Qualifier("vendorJdbcTemplate")
    private final JdbcTemplate jdbc;

    private final VendorReader vendorReader;
    private final SlopeAreaRepository areaRepository;
    private final ObservationItemRepository itemRepository;

    // ------------------------------------------------------------------ 발령 필요

    /**
     * 발령 필요 문자를 찾을 범위. 업체는 발령될 때까지 같은 문자를 24시간마다 다시 보내므로,
     * 이 안에 문자가 없으면 초과가 끝난 것이다. 발송 시각이 조금씩 밀리는 것을 감안해 1시간 여유.
     */
    static final Duration SMS_WINDOW = Duration.ofHours(25);

    /**
     * 한 단계를 이 시간 동안 넘지 않았으면 그 단계는 끝난 것으로 본다. 업체 기준표의
     * {@code dur_tm_rel} "해제를위한_지속시간(분)" 180 과 같다.
     */
    static final Duration RELEASE_AFTER = Duration.ofMinutes(180);

    /** 해제 필요 문자를 찾을 범위. 발령된 지구에만 오고 드물어 넉넉히 본다. */
    private static final Duration RELEASE_SMS_LOOKBACK = Duration.ofDays(30);

    /** 발령 단계, 높은 것부터. */
    private static final List<String> ALARM_LEVELS = List.of("DANGER", "WARNING", "ATTENTION", "INTEREST");

    private static final Pattern ZONE_IN_MSG = Pattern.compile("재해위험지구 (\\S+?)에 ");
    private static final Pattern CAUSE_IN_MSG = Pattern.compile("- (\\S+) \\([^)]*\\) \\S+ 상태");
    private static final Pattern RELEASE_IN_MSG = Pattern.compile("해제\\((\\S+) -> (\\S+)\\)");

    /**
     * 발령 필요 — <b>업체가 담당자에게 보낸 "발령이 필요합니다" 문자</b>({@code warning_sms_log})
     * 기준이다 (2026-09-30 사용자 결정). 지구당 최대 1건.
     *
     * <pre>
     * 발령 필요   최근 25시간 문자 중 가장 높은 단계에서 시작해,
     *             그 단계를 180분 동안 넘은 적이 없으면 한 단계씩 낮춘다 (없으면 빠짐)
     *             → 그 단계 이상으로 발령(snr_isnc_log)하면 빠지고 발령 이력으로
     * 해제 필요   발령된 지구에 "해제(주의 -> 정상) 발령이 필요합니다" 문자 (한 단계 낮춤도 같다)
     *             → 해제(CLEAR)하면 빠진다
     * </pre>
     *
     * <p>세 지구 모두 담당자 발령 모드다. 업체는 임계 10분 초과 시 문자만 보내고, 담당자가
     * 발령해야 지구 상태가 바뀐다. 발령이 없으면 같은 문자를 24시간마다 다시 보낸다. 값이
     * 내려가면 낮은 단계 문자를 새로 보내지만 높은 단계 문자도 며칠 더 오는 일이 있어
     * (가상시설0680 9/20~24 경계·주의), 단계별 초과는 업체 매분 판정({@code obsv_history})으로 본다.
     *
     * <p>시각은 그 단계 이상 문자의 최근 발송 시각, 원인은 그 단계를 180분 안에 넘은 계측기다.
     */
    public List<PendingAlarm> pending() {
        List<SlopeArea> areas = areaRepository.findAllByOrderByIdAsc();
        List<Long> zoneIds = areas.stream().map(SlopeArea::getVendorId).toList();
        Map<Long, String> zoneStates = vendorReader.readZoneStates(zoneIds);

        Map<Long, String> nameByItem = causeNames();

        LocalDateTime now = LocalDateTime.now();
        Map<String, List<Sms>> smsByArea = new HashMap<>();
        for (Sms sms : readSms(now.minus(RELEASE_SMS_LOOKBACK))) {
            smsByArea.computeIfAbsent(sms.areaName(), k -> new ArrayList<>()).add(sms);
        }
        Map<Long, Map<String, Set<Long>>> active = readActive(zoneIds, now.minus(RELEASE_AFTER));

        List<PendingAlarm> result = new ArrayList<>();
        for (SlopeArea area : areas) {
            List<Sms> zoneSms = smsByArea.getOrDefault(area.getName(), List.of());
            String zoneState = zoneStates.get(area.getVendorId());
            PendingAlarm issue = issuanceNeeded(area, zoneSms, zoneState,
                    active.getOrDefault(area.getVendorId(), Map.of()), nameByItem, now);
            PendingAlarm pending = issue != null ? issue : releaseNeeded(area, zoneSms, zoneState);
            if (pending != null) {
                result.add(pending);
            }
        }
        return result;
    }

    private PendingAlarm issuanceNeeded(SlopeArea area, List<Sms> zoneSms, String zoneState,
                                        Map<String, Set<Long>> activeItems, Map<Long, String> nameByItem,
                                        LocalDateTime now) {
        Need need = need(zoneSms, activeItems,
                (since, level) -> issuedAfter(area.getVendorId(), AlarmRule.ISSUANCE, since, level), now);
        if (need == null) {
            return null;
        }
        return new PendingAlarm(area.getName(), LevelName.of(need.level()), LevelName.of(zoneState),
                need.sentAt(), causeText(need.items(), nameByItem), null, null, null);   // 수치는 싣지 않는다
    }

    /**
     * 한 지구의 발령 필요 판정 결과.
     *
     * @param level  발령이 필요한 단계 (업체 코드)
     * @param sentAt 그 단계 이상 문자의 최근 발송 시각
     * @param items  그 단계를 180분 안에 넘은 업체 관측항목 id
     */
    record Need(String level, LocalDateTime sentAt, Collection<Long> items) {
    }

    /** 그 시각 뒤에 그 단계 이상으로 발령했는가. */
    interface IssuedCheck {
        boolean issuedAfter(LocalDateTime since, String level);
    }

    /**
     * 발령 필요 판정 — 한 지구, 한 시각. 화면 패널과 단계 이력 다시 채우기
     * ({@link AreaLevelBackfill})가 같은 규칙을 쓰도록 여기 하나로 둔다.
     *
     * @param zoneSms     그 지구 문자 (시각 오름차순). {@code now} 뒤 문자는 무시한다
     * @param activeItems 단계 코드 → {@code now} 전 180분 안에 그 단계를 넘은 관측항목
     * @return 발령이 필요 없으면 null
     */
    static Need need(List<Sms> zoneSms, Map<String, ? extends Collection<Long>> activeItems,
                     IssuedCheck issued, LocalDateTime now) {
        List<Sms> recent = zoneSms.stream()
                .filter(s -> s.releaseFrom() == null && !s.sentAt().isBefore(now.minus(SMS_WINDOW))
                        && !s.sentAt().isAfter(now))
                .toList();
        String top = recent.stream().map(Sms::level).reduce(null, LevelName::worse);
        String level = effectiveLevel(top, activeItems.keySet());
        if (level == null) {
            return null;
        }
        LocalDateTime sentAt = latestSent(recent, level);
        if (issued.issuedAfter(sentAt, level)) {
            return null;
        }
        return new Need(level, sentAt, activeItems.get(level));
    }

    /** 업체 관측항목 id → 업체 계측기 이름. 담당자가 받은 문자·업체 시스템과 같은 이름이라 찾아볼 수 있다. */
    Map<Long, String> causeNames() {
        Map<Long, String> nameByItem = new HashMap<>();
        for (ObservationItem item : itemRepository.findAllWithInstrument()) {
            nameByItem.put(item.getVendorId(), item.getInstrument().getSourceName());
        }
        return nameByItem;
    }

    static String causeText(Collection<Long> items, Map<Long, String> nameByItem) {
        return items.stream()
                .map(id -> nameByItem.getOrDefault(id, String.valueOf(id)))
                .distinct()
                .sorted()
                .collect(Collectors.joining(", "));
    }

    /**
     * 발령된 지구에 온 해제 필요 문자 중, 아직 해제하지 않은 것.
     *
     * <p>해제 필요 문자는 발령한 단계보다 센서 단계가 낮아졌을 때만 온다 — 정상으로 돌아올 때뿐
     * 아니라 한 단계 낮아질 때도(주의 → 관심) 온다 (2026-10-01 업체 답변). 지구 상태가 이미
     * 그 단계 이하로 내려갔거나, 문자 뒤에 해제 기록이 있으면 처리된 것이다.
     */
    private PendingAlarm releaseNeeded(SlopeArea area, List<Sms> zoneSms, String zoneState) {
        Sms release = zoneSms.stream()
                .filter(s -> s.releaseFrom() != null)
                .max(Comparator.comparing(Sms::sentAt))
                .orElse(null);
        if (release == null || zoneState == null || !LevelName.isWorse(zoneState, release.level())
                || issuedAfter(area.getVendorId(), AlarmRule.CLEAR, release.sentAt(), LevelName.NORMAL)) {
            return null;
        }
        return new PendingAlarm(area.getName(), LevelName.of(release.level()),
                LevelName.of(release.releaseFrom()), release.sentAt(), null, null, null, null);
    }

    /**
     * 표시할 단계 — 문자의 최고 단계에서 시작해, 180분 안에 넘은 적이 있는 가장 높은 단계.
     * 어느 단계도 넘지 않았으면 null (목록에서 빠진다).
     */
    static String effectiveLevel(String top, Collection<String> activeLevels) {
        if (top == null) {
            return null;
        }
        for (String level : ALARM_LEVELS) {
            if (!LevelName.isWorse(level, top) && activeLevels.contains(level)) {
                return level;
            }
        }
        return null;
    }

    /** 그 단계 이상 문자의 가장 최근 발송 시각. */
    private static LocalDateTime latestSent(List<Sms> sms, String level) {
        return sms.stream()
                .filter(s -> !LevelName.isWorse(level, s.level()))
                .map(Sms::sentAt)
                .max(Comparator.naturalOrder())
                .orElseThrow();
    }

    /**
     * 발령 필요 문자 한 통.
     *
     * @param level       업체 단계 코드. 해제 필요 문자면 낮아질 단계 (대개 NORMAL)
     * @param releaseFrom 해제 필요 문자면 해제 전 단계 코드, 아니면 null
     * @param causes      [발생원인] 의 업체 계측기 이름들. 발령 필요 이력에 남긴다
     */
    record Sms(String areaName, String level, LocalDateTime sentAt, String releaseFrom, List<String> causes) {
    }

    /** 수신자마다 한 행씩 쌓이지만 내용이 같아 결과에는 영향이 없다. 시각 오름차순. */
    List<Sms> readSms(LocalDateTime from) {
        List<Sms> result = new ArrayList<>();
        jdbc.query("""
                SELECT zne_nm, snr_step, msg, rgs_dt
                FROM ews.warning_sms_log
                WHERE rgs_dt >= ? AND msg LIKE '%발령이 필요합니다%'
                ORDER BY rgs_dt
                """, rs -> {
            Sms sms = parseSms(rs.getString("zne_nm"), rs.getString("snr_step"), rs.getString("msg"),
                    rs.getTimestamp("rgs_dt").toLocalDateTime());
            if (sms != null) {
                result.add(sms);
            }
        }, from);
        return result;
    }

    /** 대상 지구가 아니거나 단계를 모르면 null. */
    static Sms parseSms(String zoneName, String step, String msg, LocalDateTime sentAt) {
        String text = msg == null ? "" : msg.replaceAll("\\s+", " ");
        String zone = AlarmRule.normalizeZone(zoneName);
        if (zone == null) {
            Matcher m = ZONE_IN_MSG.matcher(text);
            zone = m.find() ? AlarmRule.normalizeZone(m.group(1)) : null;
        }
        String level = LevelName.codeOf(step);
        if (zone == null || level == null) {
            return null;
        }
        Matcher release = RELEASE_IN_MSG.matcher(text);
        if (release.find()) {
            String to = LevelName.codeOf(release.group(2));
            return to == null ? null : new Sms(zone, to, sentAt, LevelName.codeOf(release.group(1)), List.of());
        }
        if (LevelName.NORMAL.equals(level)) {
            return null;
        }
        List<String> causes = new ArrayList<>();
        Matcher cause = CAUSE_IN_MSG.matcher(text);
        while (cause.find()) {
            causes.add(cause.group(1));
        }
        return new Sms(zone, level, sentAt, null, causes);
    }

    /**
     * 그 시각 이후 단계별로 임계를 넘은 관측항목 — 업체 매분 판정({@code obsv_history}).
     *
     * @return 업체 지구 id → 단계 코드 → 업체 관측항목 id
     */
    private Map<Long, Map<String, Set<Long>>> readActive(List<Long> zoneIds, LocalDateTime from) {
        List<Object> args = new ArrayList<>(zoneIds);
        args.add(from);
        Map<Long, Map<String, Set<Long>>> result = new HashMap<>();
        jdbc.query("""
                SELECT DISTINCT zne_id, alarm_type, obsv_item_id
                FROM ews.obsv_history
                WHERE zne_id IN (%s) AND cal_dt >= ? AND alarm_status
                """.formatted(String.join(",", java.util.Collections.nCopies(zoneIds.size(), "?"))),
                rs -> {
                    result.computeIfAbsent(rs.getLong("zne_id"), k -> new HashMap<>())
                            .computeIfAbsent(rs.getString("alarm_type"), k -> new java.util.TreeSet<>())
                            .add(rs.getLong("obsv_item_id"));
                }, args.toArray());
        return result;
    }

    /**
     * 업체 매분 판정 중 임계를 넘은 것 — 단계 이력 다시 채우기용. 시각 오름차순.
     *
     * <p>업체는 이 테이블을 한 달 정도만 남긴다(2026-10-14 확인: 최초 기록 09-15). 그보다 앞은
     * 다시 계산할 수 없다.
     */
    List<Exceed> readExceeds(List<Long> zoneIds, LocalDateTime from) {
        List<Object> args = new ArrayList<>(zoneIds);
        args.add(from);
        return jdbc.query("""
                SELECT zne_id, alarm_type, obsv_item_id, cal_dt
                FROM ews.obsv_history
                WHERE zne_id IN (%s) AND cal_dt >= ? AND alarm_status
                ORDER BY cal_dt
                """.formatted(String.join(",", java.util.Collections.nCopies(zoneIds.size(), "?"))),
                (rs, n) -> new Exceed(rs.getLong("zne_id"), rs.getString("alarm_type"),
                        rs.getLong("obsv_item_id"), rs.getTimestamp("cal_dt").toLocalDateTime()),
                args.toArray());
    }

    /** 업체 매분 판정 중 가장 이른 시각. 비어 있으면 null. */
    LocalDateTime firstExceedRecord() {
        java.sql.Timestamp ts = jdbc.queryForObject("SELECT min(cal_dt) FROM ews.obsv_history", java.sql.Timestamp.class);
        return ts == null ? null : ts.toLocalDateTime();
    }

    /** 업체 매분 판정 한 행 — 그 시각 그 관측항목이 그 단계를 넘었다. */
    record Exceed(Long zoneId, String level, Long itemId, LocalDateTime at) {
    }

    /**
     * 그 시각 뒤에 <b>그 단계 이상으로</b> 발령(또는 해제)했는지. 했으면 담당자가 처리한 것이다.
     *
     * <p>더 낮은 단계로만 발령했다면 아직 필요하다 — "주의 필요" 문자에 관심으로 발령한 경우
     * 주의는 발령필요에 남는다 (2026-09-30 사용자 결정). 해제는 단계가 정상 하나라 있으면 된다.
     */
    private boolean issuedAfter(Long vendorZoneId, String type, LocalDateTime since, String level) {
        List<String> states = jdbc.queryForList("""
                SELECT snr_now_state FROM ews.snr_isnc_log
                WHERE zne_id = ? AND snr_isnc_type = ? AND rgs_dt > ? AND rgs_dt >= ?
                """, String.class, vendorZoneId, type, since, AlarmRule.TEST_UNTIL);
        return coveredBy(level, states);
    }

    /** 발령 단계들 중 {@code level} 이상이 하나라도 있는가. */
    static boolean coveredBy(String level, List<String> issuedStates) {
        return issuedStates.stream().anyMatch(state -> !LevelName.isWorse(level, state));
    }

    // ------------------------------------------------------------------ 발령 이력

    /**
     * 실제 발령 기록 전체. 통계의 발령 건수에 쓴다. 업체 테스트 기록({@link AlarmRule#TEST_UNTIL} 전)은 뺀다.
     *
     * <p>2년간 2건뿐이라 기간으로 좁히면 화면이 사실상 늘 비어 있다. 오른쪽 통계만 기간
     * 선택과 연동한다.
     */
    public List<AlarmHistory> history() {
        return jdbc.query("""
                SELECT zne_nm, usr_nm, snr_prev_state, snr_now_state, rgs_dt, snr_isnc_msg
                FROM ews.snr_isnc_log
                WHERE zne_id IN (%s) AND snr_isnc_type = ? AND rgs_dt >= ?
                ORDER BY rgs_dt DESC
                """.formatted(zonePlaceholders()),
                (rs, n) -> new AlarmHistory(
                        AlarmRule.normalizeZone(rs.getString("zne_nm")),
                        rs.getString("usr_nm"),
                        LevelName.of(rs.getString("snr_prev_state")),
                        LevelName.of(rs.getString("snr_now_state")),
                        rs.getTimestamp("rgs_dt").toLocalDateTime(),
                        clean(rs.getString("snr_isnc_msg"))),
                args(AlarmRule.ISSUANCE, AlarmRule.TEST_UNTIL));
    }

    // ------------------------------------------------------------------ 통계

    /** 발령·해제 건수와 단계별 분포. */
    public AlarmCounts counts(LocalDate from, LocalDate to) {
        Map<String, Integer> byLevel = new LinkedHashMap<>();
        int issued = 0;
        for (AlarmHistory a : within(history(), from, to)) {
            byLevel.merge(a.level(), 1, Integer::sum);
            issued++;
        }
        return new AlarmCounts(issued, releasedCount(from, to), byLevel);
    }

    public record AlarmCounts(int issued, int released, Map<String, Integer> byLevel) {
    }

    private int releasedCount(LocalDate from, LocalDate to) {
        Integer count = jdbc.queryForObject("""
                SELECT count(*) FROM ews.snr_isnc_log
                WHERE zne_id IN (%s) AND snr_isnc_type = ? AND rgs_dt >= ? AND rgs_dt >= ? AND rgs_dt < ?
                """.formatted(zonePlaceholders()), Integer.class,
                args(AlarmRule.CLEAR, AlarmRule.TEST_UNTIL, from.atStartOfDay(), to.plusDays(1).atStartOfDay()));
        return count == null ? 0 : count;
    }

    /** 지구별 발령 건수. 지도 버블 색에 쓴다. */
    public List<ZoneCount> byZone(LocalDate from, LocalDate to) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (AlarmHistory a : within(history(), from, to)) {
            counts.merge(a.areaName(), 1, Integer::sum);
        }
        List<ZoneCount> result = new ArrayList<>();
        counts.forEach((zone, count) -> result.add(new ZoneCount(zone, count)));
        return result;
    }

    /**
     * 월별 추이 — <b>올해 1월부터 12월까지</b>. 기간 필터와 무관하다.
     *
     * <p>최근 12개월 롤링이 아니라 달력 연도로 고정한다. 차트 X축이 1~12월로 읽혀야
     * "올해 몇 건" 이 한눈에 들어온다. 아직 오지 않은 달은 0 으로 채워 항상 12칸이다.
     */
    public List<MonthlyCount> monthly() {
        LocalDate from = LocalDate.now().withDayOfYear(1);
        LocalDate to = from.plusMonths(11);

        Map<String, Integer> counts = new LinkedHashMap<>();
        for (LocalDate m = from; !m.isAfter(to); m = m.plusMonths(1)) {
            counts.put(m.toString().substring(0, 7), 0);   // 빈 달도 0 으로 채운다
        }
        for (AlarmHistory a : within(history(), from, to.withDayOfMonth(to.lengthOfMonth()))) {
            counts.computeIfPresent(a.issuedAt().toString().substring(0, 7), (k, v) -> v + 1);
        }

        List<MonthlyCount> result = new ArrayList<>();
        counts.forEach((month, count) -> result.add(new MonthlyCount(month, count, 0)));
        return result;
    }

    /** 전체 이력에서 기간에 드는 것만. 건수가 두 자리라 DB 를 다시 치지 않는다. */
    private List<AlarmHistory> within(List<AlarmHistory> all, LocalDate from, LocalDate to) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();
        List<AlarmHistory> result = new ArrayList<>();
        for (AlarmHistory a : all) {
            if (a.areaName() != null && !a.issuedAt().isBefore(start) && a.issuedAt().isBefore(end)) {
                result.add(a);
            }
        }
        return result;
    }

    // ------------------------------------------------------------------ 지구 필터

    /**
     * {@code snr_isnc_log} 에는 시군구 컬럼이 없어 지구 id 로 거른다.
     *
     * <p>업체 DB 에 남구 밖 지구(울산지구 등)가 섞여 있어 필터가 필요하다.
     */
    private String zonePlaceholders() {
        return String.join(",", java.util.Collections.nCopies(vendorZoneIds().size(), "?"));
    }

    private List<Long> vendorZoneIds() {
        return areaRepository.findAllByOrderByIdAsc().stream().map(SlopeArea::getVendorId).toList();
    }

    /** 지구 id 를 앞에 두고 나머지 인자를 뒤에 붙인다 — placeholder 순서와 맞춘다. */
    private Object[] args(Object... rest) {
        List<Object> all = new ArrayList<>(vendorZoneIds());
        all.addAll(List.of(rest));
        return all.toArray();
    }

    /** 업체 본문에 줄바꿈·캐리지리턴이 섞여 있어 화면에서 줄이 깨진다. */
    private String clean(String msg) {
        return msg == null ? null : msg.replace("\r", " ").replaceAll("\\s+", " ").trim();
    }
}
