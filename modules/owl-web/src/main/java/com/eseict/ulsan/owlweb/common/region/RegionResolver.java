package com.eseict.ulsan.owlweb.common.region;

import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 메시지 위치명 → 행정동 id ({@code common.region}).
 *
 * <p>위치명은 owl 이 주소 보강으로 채운 행정동명("가상시설04722동")이거나 원본 위치명
 * ("가상시설0565 가상시설04722동")이라, <b>마지막 단어</b>를 행정동명과 비교한다.
 * 법정동명으로 온 경우(예: "… 달동")처럼 맞는 행정동이 없으면 null — 목록엔 보이고 지역 필터에서만 빠진다.
 *
 * <p>행정동 목록은 거의 바뀌지 않으므로 처음 한 번 읽어 둔다. 바뀌면 재시작.
 */
@Component
@RequiredArgsConstructor
public class RegionResolver {

    private final RegionRepository regionRepository;

    private volatile Map<String, Long> idByName;

    public Long resolve(String regionName) {
        if (regionName == null || regionName.isBlank()) {
            return null;
        }
        String[] tokens = regionName.trim().split("\\s+");
        return idByName().get(tokens[tokens.length - 1]);
    }

    private Map<String, Long> idByName() {
        Map<String, Long> map = idByName;
        if (map == null) {
            map = regionRepository.findAll().stream()
                    .collect(Collectors.toMap(Region::getName, Region::getId, (a, b) -> a));
            idByName = map;
        }
        return map;
    }
}
