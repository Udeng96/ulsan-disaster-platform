package com.eseict.ulsan.slope.ingest;

import com.eseict.ulsan.slope.facility.Instrument;
import com.eseict.ulsan.slope.facility.InstrumentCategory;
import com.eseict.ulsan.slope.facility.InstrumentRepository;
import com.eseict.ulsan.slope.facility.ObservationCategory;
import com.eseict.ulsan.slope.facility.ObservationItem;
import com.eseict.ulsan.slope.facility.ObservationItemRepository;
import com.eseict.ulsan.slope.facility.SlopeArea;
import com.eseict.ulsan.slope.facility.SlopeAreaRepository;
import com.eseict.ulsan.slope.ingest.dto.VendorInstrument;
import com.eseict.ulsan.slope.ingest.dto.VendorItem;
import com.eseict.ulsan.slope.ingest.dto.VendorZone;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 급경사지·계측기·관측항목 마스터 동기화.
 *
 * <p>거의 바뀌지 않는 정보다 — 급경사지 3, 계측기 48, 관측항목 70. 자정에 한 번 맞춘다.
 *
 * <p><b>없어진 것을 지우지 않는다.</b> 업체에서 사라졌다고 우리 행을 삭제하면 그 계측기의
 * 측정값·단계 이력이 FK 로 딸려 나간다. 업체 조회가 일시적으로 실패했을 때 전건이 지워지는
 * 사고도 막는다. 실제로 철거된 경우는 {@code use_yn} 으로 끄는 게 맞다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "slope.vendor.enabled", havingValue = "true")
public class MetaSyncService {

    private final VendorReader reader;
    private final SlopeAreaRepository areaRepository;
    private final InstrumentRepository instrumentRepository;
    private final ObservationItemRepository itemRepository;

    /**
     * 업체 조회는 세 번뿐이다 — 지구·계측기·관측항목 각 1회. 망연계 너머라 호출 수를 늘리지
     * 않는 것이 중요하다.
     */
    @Transactional
    public void sync() {
        List<VendorZone> zones = reader.readZones();
        List<VendorInstrument> vendorInstruments = reader.readInstruments();
        List<VendorItem> items = reader.readItems();

        Map<Long, SlopeArea> areas = syncAreas(zones);
        Map<Long, Instrument> instruments = syncInstruments(vendorInstruments, areas, items);
        syncItems(items, instruments);
    }

    /** @return 업체 zne_id → 우리 SlopeArea */
    private Map<Long, SlopeArea> syncAreas(List<VendorZone> zones) {
        Map<Long, SlopeArea> byVendorId = new HashMap<>();
        int added = 0;
        for (VendorZone z : zones) {
            SlopeArea area = areaRepository.findByVendorId(z.zneId()).orElse(null);
            if (area == null) {
                area = areaRepository.save(new SlopeArea(
                        z.zneId(), z.name(), z.address(), z.legalDongCode(),
                        z.lat(), z.lng(), z.gridX(), z.gridY()));
                added++;
            }
            byVendorId.put(z.zneId(), area);
        }
        if (added > 0) {
            log.info("급경사지 동기화 — 신규 {}건 (전체 {}건)", added, zones.size());
        }
        return byVendorId;
    }

    /** @return 업체 obsv_id → 우리 Instrument */
    private Map<Long, Instrument> syncInstruments(List<VendorInstrument> vendorInstruments,
                                                  Map<Long, SlopeArea> areas,
                                                  List<VendorItem> items) {
        Map<Long, InstrumentCategory> categories = categoriesOf(items);
        Map<Long, Instrument> byVendorId = new HashMap<>();
        int added = 0;
        int skipped = 0;
        for (VendorInstrument v : vendorInstruments) {
            Instrument instrument = instrumentRepository.findByVendorId(v.obsvId()).orElse(null);
            if (instrument == null) {
                SlopeArea area = areas.get(v.zneId());
                if (area == null) {
                    // 남구 밖 지구에 속한 계측기. 업체 DB 에는 다른 지자체 데이터도 있다.
                    skipped++;
                    continue;
                }
                instrument = instrumentRepository.save(new Instrument(
                        v.obsvId(), area, v.name(),
                        Instrument.toDisplayName(v.name()),
                        categories.getOrDefault(v.obsvId(), InstrumentCategory.INCLINOMETER),
                        Instrument.collectorOf(v.name()),
                        Instrument.displayNoOf(v.name()),
                        v.lat(), v.lng(), v.spotNo(), v.address(), v.installedAt()));
                added++;
            }
            byVendorId.put(v.obsvId(), instrument);
        }
        if (added > 0 || skipped > 0) {
            log.info("계측기 동기화 — 신규 {}건 / 대상외 {}건 (전체 {}건)",
                    added, skipped, vendorInstruments.size());
        }
        return byVendorId;
    }

    private void syncItems(List<VendorItem> items, Map<Long, Instrument> instruments) {
        int added = 0;
        int unknown = 0;
        for (VendorItem v : items) {
            if (itemRepository.findByVendorId(v.obsvItemId()).isPresent()) {
                continue;
            }
            Instrument instrument = instruments.get(v.obsvId());
            ObservationCategory category = ObservationCategory.ofVendorName(v.itemName());
            if (instrument == null || category == null) {
                // 대상 밖 계측기이거나, 우리가 모르는 관측항목이 새로 생긴 경우.
                // 후자면 ObservationCategory 에 추가해야 한다.
                if (instrument != null) {
                    log.warn("모르는 관측항목 — obsv_item_id={} name={}", v.obsvItemId(), v.itemName());
                    unknown++;
                }
                continue;
            }
            itemRepository.save(new ObservationItem(v.obsvItemId(), instrument, category, v.unit()));
            added++;
        }
        if (added > 0 || unknown > 0) {
            log.info("관측항목 동기화 — 신규 {}건 / 미지원 {}건 (전체 {}건)", added, unknown, items.size());
        }
    }

    /**
     * 계측기 종류를 관측항목명으로 판정한다 — 업체 {@code obsv_id} → 종류.
     *
     * <p>업체 {@code obsv.ordr}(1/3/4)이 종류와 정확히 대응하지만 매뉴얼에 "순서"로만 적혀
     * 있어 의미를 보장할 수 없다. 관측항목명은 이름이 직접 적혀 있어 확실하다.
     *
     * <p>경사계는 관측항목이 둘(경사계·토양함수비)인데 양쪽 다 {@code INCLINOMETER} 로
     * 접히므로 어느 것을 먼저 만나든 결과가 같다.
     */
    private Map<Long, InstrumentCategory> categoriesOf(List<VendorItem> items) {
        Map<Long, InstrumentCategory> byObsvId = new HashMap<>();
        for (VendorItem item : items) {
            InstrumentCategory c = InstrumentCategory.ofVendorItem(item.itemName());
            if (c != null) {
                byObsvId.putIfAbsent(item.obsvId(), c);
            }
        }
        return byObsvId;
    }
}
