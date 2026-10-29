package com.eseict.ulsan.slope.ingest;

import com.eseict.ulsan.slope.alarm.AreaLevelBackfill;
import com.eseict.ulsan.slope.alarm.AreaLevelTracker;
import com.eseict.ulsan.slope.facility.SlopeAreaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class IngestSchedulerConfigurationTest {
    private final ApplicationContextRunner context = new ApplicationContextRunner()
            .withUserConfiguration(IngestScheduler.class)
            .withBean(MetaSyncService.class, () -> mock(MetaSyncService.class))
            .withBean(AreaLevelTracker.class, () -> mock(AreaLevelTracker.class))
            .withBean(AreaLevelBackfill.class, () -> mock(AreaLevelBackfill.class))
            .withBean(SlopeAreaRepository.class, () -> mock(SlopeAreaRepository.class));

    @Test
    void ingestionRemainsEnabledByDefault() {
        context.withPropertyValues("slope.vendor.enabled=true")
                .run(c -> assertThat(c).hasSingleBean(IngestScheduler.class));
    }

    @Test
    void readOnlyVerificationDoesNotRegisterStartupOrScheduledIngestion() {
        context.withPropertyValues("slope.vendor.enabled=true", "slope.ingest.enabled=false")
                .run(c -> assertThat(c).doesNotHaveBean(IngestScheduler.class));
    }

    @Test
    void disabledVendorStillDisablesIngestion() {
        context.withPropertyValues("slope.vendor.enabled=false", "slope.ingest.enabled=true")
                .run(c -> assertThat(c).doesNotHaveBean(IngestScheduler.class));
    }
}
