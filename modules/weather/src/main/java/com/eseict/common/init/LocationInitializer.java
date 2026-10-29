package com.eseict.common.init;

import com.eseict.common.domain.Location;
import com.eseict.common.repository.LocationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * 앱 기동 시 1회 — "가상시설0565" 시드 데이터 삽입.
 * 이미 있으면 skip (멱등).
 */
@Component
@Order(1)
public class LocationInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(LocationInitializer.class);
    public static final String ULSAN_NAMGU = "가상시설0565";

    private final LocationRepository repository;

    public LocationInitializer(LocationRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        if (repository.findByName(ULSAN_NAMGU).isPresent()) {
            log.info("Seed location already exists: {}", ULSAN_NAMGU);
            return;
        }
        Location ulsan = new Location(
                ULSAN_NAMGU,
                new BigDecimal("0.0"),    // 위도 (남구청 기준)
                new BigDecimal("0.0"),   // 경도
                102,                            // KMA grid NX
                84,                             // KMA grid NY
                "159",                          // 기상특보 stnId (울산)
                "가상시설0480"                        // 에어코리아 측정소명
        );
        repository.save(ulsan);
        log.info("Seeded location: {}", ULSAN_NAMGU);
    }
}
