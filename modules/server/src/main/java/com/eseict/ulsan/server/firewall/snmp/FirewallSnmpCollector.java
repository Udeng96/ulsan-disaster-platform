package com.eseict.ulsan.server.firewall.snmp;

import com.eseict.ulsan.server.common.snmp.SnmpClient;
import com.eseict.ulsan.server.common.snmp.SnmpV3Target;
import com.eseict.ulsan.server.firewall.FirewallProperties;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 10초마다 방화벽 SNMP 를 읽어 fw_status / fw_interface / fw_policy 에 쌓는다.
 * 정책 표는 덮어쓰기 전에 직전 표와 비교해, 달라졌으면 fw_policy_change 에 한 줄 남긴다.
 * 직전 표가 비어 있으면(처음 기동·빈 DB) 비교 기준이 없으므로 기록하지 않는다.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "firewall.snmp", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
public class FirewallSnmpCollector {

    private static final DateTimeFormatter LAST_HIT = DateTimeFormatter.ofPattern("EEE MMM d HH:mm:ss yyyy", Locale.ENGLISH);
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final FirewallProperties props;
    private final FwStatusRepository statusRepository;
    private final FwInterfaceRepository interfaceRepository;
    private final FwPolicyRepository policyRepository;
    private final FwPolicyChangeRepository policyChangeRepository;

    /** bps 계산용 직전 샘플. 재기동 후 첫 샘플은 bps 가 null 이다. */
    private final Map<String, FwInterface> previous = new HashMap<>();

    @Scheduled(fixedDelayString = "${firewall.snmp.interval-ms}")
    @Transactional
    public void collect() {
        FirewallProperties.Snmp c = props.snmp();
        SnmpV3Target target = new SnmpV3Target(c.host(), c.port(), c.user(), c.authPassword(), c.privPassword(), c.timeoutMs());
        long started = System.currentTimeMillis();
        try (SnmpClient snmp = new SnmpClient(target)) {
            Map<String, String> scalars = snmp.get(List.of(
                    SecuiOid.UPTIME_SEC, SecuiOid.SESSION_CNT, SecuiOid.CPU_PCT,
                    SecuiOid.MEM_TOTAL, SecuiOid.MEM_USED, SecuiOid.MEM_PCT,
                    SecuiOid.DISK_SYS_PCT, SecuiOid.DISK_LOG_PCT, SecuiOid.DISK_TMP_PCT,
                    SecuiOid.SENSOR_TEMP_CPU));
            int rtt = (int) (System.currentTimeMillis() - started);
            Map<String, String> fans = snmp.walk(SecuiOid.SENSOR_FAN_TABLE);
            Map<String, String> ifs = snmp.walk(SecuiOid.IF_TABLE);
            Map<String, String> policies = snmp.walk(SecuiOid.POLICY_TABLE);
            OffsetDateTime now = OffsetDateTime.now();

            FwStatus status = toStatus(scalars, fans, now, rtt);
            List<FwInterface> interfaces = toInterfaces(ifs, now);
            List<FwPolicy> currentPolicies = toPolicies(policies, now);
            statusRepository.save(status);
            interfaceRepository.saveAll(interfaces);
            List<FwPolicy> before = policyRepository.findAll();
            PolicyDiff diff = PolicyDiff.of(before, currentPolicies);
            if (!before.isEmpty() && !diff.isEmpty()) {
                int allow = (int) currentPolicies.stream().filter(p -> "ALLOW".equals(p.getAction())).count();
                policyChangeRepository.save(new FwPolicyChange(now, currentPolicies.size(), allow,
                        diff.added(), diff.removed(), diff.actionChanged()));
                log.info("[firewall] 정책 변경 추가={} 삭제={} 허용/차단={}", diff.added(), diff.removed(), diff.actionChanged());
            }
            policyRepository.deleteAllInBatch();
            policyRepository.saveAll(currentPolicies);
            log.info("[firewall] snmp 조회 완료 host={} rtt={}ms", c.host(), rtt);
        } catch (Exception e) {
            previous.clear();
            log.warn("[firewall] snmp 수집 실패 host={}: {}", c.host(), e.getMessage(), e);
            throw new IllegalStateException("방화벽 수집 실패", e);
        }
    }

    private FwStatus toStatus(Map<String, String> s, Map<String, String> fans, OffsetDateTime now, int rtt) {
        List<Integer> rpm = new ArrayList<>();
        SnmpClient.column(fans, SecuiOid.SENSOR_FAN_TABLE).forEach(r -> {
            int v = Integer.parseInt(r[1]);
            if (v > 0) rpm.add(v);   // 0 은 없는 슬롯
        });
        return FwStatus.builder()
                .collectedAt(now)
                .uptimeSec(longOf(s.get(SecuiOid.UPTIME_SEC)))
                .sessionCnt(intOf(s.get(SecuiOid.SESSION_CNT)))
                .cpuPct(decimalOf(s.get(SecuiOid.CPU_PCT)))
                .memTotal(longOf(s.get(SecuiOid.MEM_TOTAL)))
                .memUsed(longOf(s.get(SecuiOid.MEM_USED)))
                .memPct(shortOf(s.get(SecuiOid.MEM_PCT)))
                .diskSysPct(shortOf(s.get(SecuiOid.DISK_SYS_PCT)))
                .diskLogPct(shortOf(s.get(SecuiOid.DISK_LOG_PCT)))
                .diskTmpPct(shortOf(s.get(SecuiOid.DISK_TMP_PCT)))
                .cpuTempC(milliToDecimal(s.get(SecuiOid.SENSOR_TEMP_CPU)))
                .fanRpm(rpm.toArray(Integer[]::new))
                .rttMs(rtt)
                .build();
    }

    private List<FwInterface> toInterfaces(Map<String, String> w, OffsetDateTime now) {
        List<FwInterface> out = new ArrayList<>();
        for (String[] row : SnmpClient.column(w, SecuiOid.IF_NAME)) {
            String idx = row[0];
            String name = row[1];
            // "1Gbps^Full Duplex^on^UP^yes" — 속도^듀플렉스^관리상태^링크^케이블 연결
            String[] st = w.getOrDefault(SecuiOid.IF_STATE + "." + idx, "^^^^").split("\\^", -1);
            long in = longOf(w.get(SecuiOid.IF_IN + "." + idx));
            long outB = longOf(w.get(SecuiOid.IF_OUT + "." + idx));
            FwInterface prev = previous.get(name);
            Long inBps = null;
            Long outBps = null;
            if (prev != null) {
                double sec = (now.toEpochSecond() - prev.getCollectedAt().toEpochSecond());
                if (sec > 0 && in >= prev.getInBytes() && outB >= prev.getOutBytes()) {
                    inBps = (long) ((in - prev.getInBytes()) * 8 / sec);
                    outBps = (long) ((outB - prev.getOutBytes()) * 8 / sec);
                }
            }
            FwInterface cur = FwInterface.builder()
                    .collectedAt(now)
                    .ifName(name)
                    .zone(w.get(SecuiOid.IF_ZONE + "." + idx))
                    .linkUp(st.length > 4 && "yes".equals(st[4]))
                    .speed(st[0].isEmpty() ? null : st[0])
                    .duplex(st.length > 1 && !st[1].isEmpty() ? st[1] : null)
                    .inBytes(in)
                    .outBytes(outB)
                    .inBps(inBps)
                    .outBps(outBps)
                    .build();
            previous.put(name, cur);
            out.add(cur);
        }
        return out;
    }

    private List<FwPolicy> toPolicies(Map<String, String> w, OffsetDateTime now) {
        List<FwPolicy> out = new ArrayList<>();
        for (String[] row : SnmpClient.column(w, SecuiOid.POLICY_NAME)) {
            String idx = row[0];
            String hit = w.getOrDefault(SecuiOid.POLICY_LAST_HIT + "." + idx, "");
            out.add(FwPolicy.builder()
                    .policyIdx(Integer.parseInt(idx))
                    .name(row[1])
                    .action(w.get(SecuiOid.POLICY_ACTION + "." + idx))
                    .packets(longOf(w.get(SecuiOid.POLICY_PACKETS + "." + idx)))
                    .bytes(longOf(w.get(SecuiOid.POLICY_BYTES + "." + idx)))
                    .sessionCnt(intOf(w.get(SecuiOid.POLICY_SESSIONS + "." + idx)))
                    .lastHitAt(hit.isBlank() ? null : java.time.LocalDateTime.parse(hit.replaceAll(" +", " "), LAST_HIT).atZone(SEOUL).toOffsetDateTime())
                    .collectedAt(now)
                    .build());
        }
        return out;
    }

    private static long longOf(String v) {
        return v == null || v.isBlank() ? 0L : Long.parseLong(v);
    }

    private static Integer intOf(String v) {
        return v == null || v.isBlank() ? null : Integer.parseInt(v);
    }

    private static Short shortOf(String v) {
        return v == null || v.isBlank() ? null : Short.parseShort(v);
    }

    private static BigDecimal decimalOf(String v) {
        return v == null || v.isBlank() ? null : new BigDecimal(v);
    }

    private static BigDecimal milliToDecimal(String v) {
        return v == null || v.isBlank() ? null : new BigDecimal(v).movePointLeft(3).setScale(1, java.math.RoundingMode.HALF_UP);
    }
}
