package com.eseict.dashboard.web;

import com.eseict.airquality.domain.AirQuality;
import com.eseict.airquality.repository.AirQualityRepository;
import com.eseict.common.domain.Location;
import com.eseict.common.init.LocationInitializer;
import com.eseict.common.repository.LocationRepository;
import com.eseict.forecast.domain.Observation;
import com.eseict.forecast.domain.Prediction;
import com.eseict.forecast.repository.ObservationRepository;
import com.eseict.forecast.repository.PredictionRepository;
import com.eseict.warning.domain.Warning;
import com.eseict.warning.repository.WarningRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 좌측 IP wall 패널의 weather summary 응답 조립.
 * 단일 location ("가상시설0565") 가정 — multi-location 필요해지면 파라미터화.
 */
@Service
public class WeatherService {

    private static final int PREDICTION_HOURS = 3; // 시간별 예보 row 개수
    private static final int WARNING_LIMIT = 5;    // 활성 특보 최대 노출 건수
    private static final int WARNING_LOOKBACK_DAYS = 7; // 발표↔해제 매칭 위한 조회 기간
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    /**
     * KMA 특보 title 패턴.
     *   "[특보] 제05-12호 : 2026.05.20.14:20 / 호우주의보 발표 (*)"
     *                                          └─ group(1) ─┘ └ group(2) ┘
     * group(1) = 종류 (예: "호우주의보", "풍랑주의보", "건조주의보")
     * group(2) = "발표" or "해제"
     */
    private static final Pattern TITLE_TYPE_ACTION = Pattern.compile("/\\s+(\\S+)\\s+(발표|해제)");

    private final LocationRepository locationRepository;
    private final ObservationRepository observationRepository;
    private final PredictionRepository predictionRepository;
    private final AirQualityRepository airQualityRepository;
    private final WarningRepository warningRepository;

    public WeatherService(LocationRepository locationRepository,
                          ObservationRepository observationRepository,
                          PredictionRepository predictionRepository,
                          AirQualityRepository airQualityRepository,
                          WarningRepository warningRepository) {
        this.locationRepository = locationRepository;
        this.observationRepository = observationRepository;
        this.predictionRepository = predictionRepository;
        this.airQualityRepository = airQualityRepository;
        this.warningRepository = warningRepository;
    }

    @Transactional(readOnly = true)
    public WeatherSummaryResponse summary() {
        Location loc = locationRepository.findByName(LocationInitializer.ULSAN_NAMGU)
                .orElseThrow(() -> new IllegalStateException(
                        "seed location not found: " + LocationInitializer.ULSAN_NAMGU));

        Observation obs = observationRepository.findTopByLocationIdOrderByObservedAtDesc(loc.getId());
        List<Prediction> preds = predictionRepository.findUpcomingFromLatestBase(
                loc.getId(), OffsetDateTime.now(), PageRequest.of(0, PREDICTION_HOURS));
        AirQuality air = loc.getAirStationName() == null ? null :
                airQualityRepository.findTopByStationNameOrderByMeasuredAtDesc(loc.getAirStationName());
        // 활성 특보 — 최근 7일치 가져온 뒤 종류별 마지막 이벤트가 "발표"인 것만 노출.
        // (어제 발효돼서 아직 해제 안 된 특보도 포함, 해제 알림은 자동 제외.)
        OffsetDateTime lookbackFrom = LocalDate.now(KST).minusDays(WARNING_LOOKBACK_DAYS)
                .atStartOfDay(KST).toOffsetDateTime();
        List<Warning> recent = loc.getWarningStnId() == null ? List.of() :
                warningRepository.findActiveByStnIdSince(
                        loc.getWarningStnId(), lookbackFrom, 100);
        List<Warning> warnings = computeActiveWarnings(recent);

        return new WeatherSummaryResponse(
                new WeatherSummaryResponse.LocationDto(
                        loc.getName(), loc.getLatitude(), loc.getLongitude()),
                obs == null ? null : new WeatherSummaryResponse.ObservationDto(
                        obs.getObservedAt(),
                        obs.getTemperatureC(),
                        obs.getHumidityPct(),
                        obs.getRainfallMm(),
                        obs.getWindSpeedMs(),
                        obs.getWindDirectionDeg(),
                        obs.getPtyCode()),
                preds.stream().map(p -> new WeatherSummaryResponse.PredictionDto(
                        p.getForecastAt(),
                        p.getSkyCode(),
                        p.getPtyCode(),
                        p.getTemperatureC(),
                        p.getHumidityPct(),
                        p.getRainfallMm(),
                        p.getWindSpeedMs(),
                        p.getWindDirectionDeg()
                )).toList(),
                air == null ? null : new WeatherSummaryResponse.AirQualityDto(
                        air.getMeasuredAt(),
                        air.getStationName(),
                        air.getPm10Value(), air.getPm10Grade(),
                        air.getPm25Value(), air.getPm25Grade(),
                        air.getO3Value(), air.getO3Grade(),
                        air.getKhaiValue(), air.getKhaiGrade()),
                warnings.stream().map(w -> new WeatherSummaryResponse.WarningDto(
                        w.getTmFc(), w.getTitle(), w.getContent()
                )).toList()
        );
    }

    /**
     * 종류별로 가장 최근 이벤트만 추리고, 그 이벤트가 "발표"인 종류만 활성으로 본다.
     * 입력 {@code warnings} 는 tm_fc DESC (최신이 먼저) 정렬되어 있다고 가정.
     */
    private static List<Warning> computeActiveWarnings(List<Warning> warnings) {
        Map<String, Warning> latestByType = new LinkedHashMap<>();
        Map<String, String> lastActionByType = new LinkedHashMap<>();
        for (Warning w : warnings) {
            Matcher m = TITLE_TYPE_ACTION.matcher(w.getTitle());
            if (!m.find()) continue;
            String type = m.group(1);
            String action = m.group(2);
            // tm_fc DESC 정렬이므로 처음 등장 = 가장 최신
            if (!latestByType.containsKey(type)) {
                latestByType.put(type, w);
                lastActionByType.put(type, action);
            }
        }
        return latestByType.entrySet().stream()
                .filter(e -> "발표".equals(lastActionByType.get(e.getKey())))
                .map(Map.Entry::getValue)
                .limit(WARNING_LIMIT)
                .toList();
    }
}
