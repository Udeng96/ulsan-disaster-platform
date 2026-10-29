package com.eseict.ulsan.server.sw.snmp;

import com.eseict.ulsan.server.common.snmp.SnmpClient;
import com.eseict.ulsan.server.common.snmp.SnmpV2cTarget;
import com.eseict.ulsan.server.sw.SwitchProperties;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 10초마다 스위치 SNMP 를 읽어 sw_status / sw_interface(에러 수·브로드캐스트 포함) / sw_mac 에 쌓는다.
 * 직전 샘플과 비교해 포트 변화(연결됨·끊김·에러 늘어남·처음 보는 장비)를 sw_event 에 남긴다.
 * 아는 장비 표(sw_known_mac)가 비어 있으면 그때 보이는 MAC 을 전부 아는 장비로 넣는다 (처음 한 번).
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "switch.snmp", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
public class SwitchSnmpCollector {

    private final SwitchProperties props;
    private final SwStatusRepository statusRepository;
    private final SwInterfaceRepository interfaceRepository;
    private final SwMacRepository macRepository;
    private final SwKnownMacRepository knownMacRepository;
    private final SwEventRepository eventRepository;

    /** bps 계산용 직전 샘플. 재기동 후 첫 샘플은 bps 가 null. */
    private final Map<Integer, SwInterface> previous = new HashMap<>();

    @Scheduled(fixedDelayString = "${switch.snmp.interval-ms}")
    @Transactional
    public void collect() {
        SwitchProperties.Snmp c = props.snmp();
        long started = System.currentTimeMillis();
        try (SnmpClient snmp = new SnmpClient(new SnmpV2cTarget(c.host(), c.port(), c.community(), c.timeoutMs()))) {
            Map<String, String> scalars = snmp.get(List.of(
                    SubGateOid.SYS_UPTIME, SubGateOid.LOAD_1M, SubGateOid.MEM_TOTAL_KB, SubGateOid.MEM_USED_KB));
            int rtt = (int) (System.currentTimeMillis() - started);
            Map<String, String> descr = snmp.walk(SubGateOid.IF_DESCR);
            Map<String, String> oper = snmp.walk(SubGateOid.IF_OPER_STATUS);
            Map<String, String> speed = snmp.walk(SubGateOid.IF_HIGH_SPEED);
            Map<String, String> in = snmp.walk(SubGateOid.IF_HC_IN);
            Map<String, String> out = snmp.walk(SubGateOid.IF_HC_OUT);
            Map<String, String> inErr = snmp.walk(SubGateOid.IF_IN_ERRORS);
            Map<String, String> outErr = snmp.walk(SubGateOid.IF_OUT_ERRORS);
            Map<String, String> fdb = snmp.walk(SubGateOid.FDB_PORT);
            Map<String, String> ucast = snmp.walk(SubGateOid.IF_HC_IN_UCAST);
            Map<String, String> mcast = snmp.walk(SubGateOid.IF_HC_IN_MCAST);
            Map<String, String> bcast = snmp.walk(SubGateOid.IF_HC_IN_BCAST);
            OffsetDateTime now = OffsetDateTime.now();

            statusRepository.save(SwStatus.builder()
                    .collectedAt(now)
                    .uptimeSec(ticksToSec(scalars.get(SubGateOid.SYS_UPTIME)))
                    .load1m(decimalOf(scalars.get(SubGateOid.LOAD_1M)))
                    .memTotalKb(longOf(scalars.get(SubGateOid.MEM_TOTAL_KB)))
                    .memUsedKb(longOf(scalars.get(SubGateOid.MEM_USED_KB)))
                    .rttMs(rtt)
                    .build());
            Map<Integer, SwInterface> before = new HashMap<>(previous);
            List<SwInterface> ifs = toInterfaces(descr, oper, speed, in, out, inErr, outErr, ucast, mcast, bcast, now);
            List<SwMac> macs = toMacs(fdb, ifs, now);
            List<SwEvent> events = new ArrayList<>(PortChanges.ports(before, ifs, now));
            events.addAll(macEvents(macs, now));
            interfaceRepository.saveAll(ifs);
            macRepository.deleteAllInBatch();
            macRepository.saveAll(macs);
            if (!events.isEmpty()) {
                eventRepository.saveAll(events);
                events.forEach(e -> log.info("[switch] {}", e.getDetail()));
            }
            log.info("[switch] snmp 조회 완료 host={} rtt={}ms", c.host(), rtt);
        } catch (Exception e) {
            previous.clear();
            log.warn("[switch] snmp 수집 실패 host={}: {}", c.host(), e.getMessage(), e);
            throw new IllegalStateException("스위치 수집 실패", e);
        }
    }

    private List<SwInterface> toInterfaces(Map<String, String> descr, Map<String, String> oper, Map<String, String> speed,
                                           Map<String, String> in, Map<String, String> out,
                                           Map<String, String> inErr, Map<String, String> outErr,
                                           Map<String, String> ucast, Map<String, String> mcast, Map<String, String> bcast,
                                           OffsetDateTime now) {
        List<SwInterface> list = new ArrayList<>();
        for (String[] row : SnmpClient.column(descr, SubGateOid.IF_DESCR)) {
            String name = row[1];
            if (!name.startsWith("ge") && !name.startsWith("xe")) continue;   // lo, vlan 제외
            int idx = Integer.parseInt(row[0]);
            long inB = longOf(in.get(SubGateOid.IF_HC_IN + "." + idx));
            long outB = longOf(out.get(SubGateOid.IF_HC_OUT + "." + idx));
            SwInterface prev = previous.get(idx);
            Long uc = longOrNull(ucast.get(SubGateOid.IF_HC_IN_UCAST + "." + idx));
            Long mc = longOrNull(mcast.get(SubGateOid.IF_HC_IN_MCAST + "." + idx));
            Long bc = longOrNull(bcast.get(SubGateOid.IF_HC_IN_BCAST + "." + idx));
            Long pkts = uc == null && mc == null && bc == null ? null
                    : (uc == null ? 0 : uc) + (mc == null ? 0 : mc) + (bc == null ? 0 : bc);
            Long inBps = null;
            Long outBps = null;
            Long inPps = null;
            Long bcastPps = null;
            if (prev != null) {
                double sec = now.toEpochSecond() - prev.getCollectedAt().toEpochSecond();
                if (sec > 0 && inB >= prev.getInBytes() && outB >= prev.getOutBytes()) {
                    inBps = (long) ((inB - prev.getInBytes()) * 8 / sec);
                    outBps = (long) ((outB - prev.getOutBytes()) * 8 / sec);
                }
                if (sec > 0 && pkts != null && bc != null && prev.getInPkts() != null && prev.getInBcast() != null
                        && pkts >= prev.getInPkts() && bc >= prev.getInBcast()) {
                    inPps = (long) ((pkts - prev.getInPkts()) / sec);
                    bcastPps = (long) ((bc - prev.getInBcast()) / sec);
                }
            }
            String sp = speed.get(SubGateOid.IF_HIGH_SPEED + "." + idx);
            SwInterface cur = SwInterface.builder()
                    .collectedAt(now)
                    .ifIndex(idx)
                    .ifName(name)
                    .linkUp("1".equals(oper.get(SubGateOid.IF_OPER_STATUS + "." + idx)))
                    .speedMbps(sp == null || sp.isBlank() ? null : Integer.parseInt(sp))
                    .inBytes(inB)
                    .outBytes(outB)
                    .inBps(inBps)
                    .outBps(outBps)
                    .inErrors(longOrNull(inErr.get(SubGateOid.IF_IN_ERRORS + "." + idx)))
                    .outErrors(longOrNull(outErr.get(SubGateOid.IF_OUT_ERRORS + "." + idx)))
                    .inPkts(pkts)
                    .inBcast(bc)
                    .inPps(inPps)
                    .bcastPps(bcastPps)
                    .build();
            previous.put(idx, cur);
            list.add(cur);
        }
        return list;
    }

    /** 아는 장비 표가 비면 지금 MAC 을 전부 등록(기록 없음). 아니면 새로 나타난 모르는 MAC 만 기록. */
    private List<SwEvent> macEvents(List<SwMac> macs, OffsetDateTime now) {
        if (knownMacRepository.count() == 0) {
            if (!macs.isEmpty()) {
                knownMacRepository.saveAll(macs.stream()
                        .map(m -> new SwKnownMac(m.getMac(), m.getIfName(), "처음 켤 때 자동 등록", now)).toList());
                log.info("[switch] 아는 장비 {}개 처음 등록", macs.size());
            }
            return List.of();
        }
        Set<String> known = knownMacRepository.findAll().stream().map(SwKnownMac::getMac).collect(Collectors.toSet());
        Set<String> was = macRepository.findAll().stream().map(SwMac::getMac).collect(Collectors.toSet());
        Map<String, String> cur = new LinkedHashMap<>();
        macs.forEach(m -> cur.put(m.getMac(), m.getIfName()));
        return PortChanges.newMacs(cur, was, known, now);
    }

    /** FDB 인덱스 "0.5.102.42.233.126" → "02:00:00:00:00:01", 값(포트) → 인터페이스 이름. */
    private static List<SwMac> toMacs(Map<String, String> fdb, List<SwInterface> ifs, OffsetDateTime now) {
        Map<Integer, String> nameByIndex = new HashMap<>();
        ifs.forEach(i -> nameByIndex.put(i.getIfIndex(), i.getIfName()));
        List<SwMac> list = new ArrayList<>();
        for (String[] row : SnmpClient.column(fdb, SubGateOid.FDB_PORT)) {
            String[] dec = row[0].split("\\.");
            if (dec.length != 6) continue;
            StringBuilder mac = new StringBuilder();
            for (String d : dec) {
                if (mac.length() > 0) mac.append(':');
                mac.append(String.format("%02x", Integer.parseInt(d)));
            }
            String ifName = nameByIndex.get(Integer.parseInt(row[1]));
            if (ifName != null) list.add(new SwMac(mac.toString(), ifName, now));
        }
        return list;
    }

    private static long longOf(String v) {
        return v == null || v.isBlank() ? 0L : Long.parseLong(v);
    }

    private static Long longOrNull(String v) {
        return v == null || v.isBlank() ? null : Long.parseLong(v);
    }

    private static Long ticksToSec(String v) {
        return v == null || v.isBlank() ? null : Long.parseLong(v) / 100;
    }

    private static BigDecimal decimalOf(String v) {
        return v == null || v.isBlank() ? null : new BigDecimal(v);
    }
}
