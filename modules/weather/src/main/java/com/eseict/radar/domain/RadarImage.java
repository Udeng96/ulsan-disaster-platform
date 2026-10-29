package com.eseict.radar.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.OffsetDateTime;

@Entity
@Table(
        name = "radar_image",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_radar_img_natural",
                        columnNames = {"radar_type", "observed_at_utc"}),
                @UniqueConstraint(name = "uk_radar_img_source_url",
                        columnNames = {"source_url"})
        },
        indexes = @Index(
                name = "ix_radar_img_type_time",
                columnList = "radar_type, observed_at_utc DESC"
        )
)
public class RadarImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "radar_type", nullable = false, length = 16)
    private String radarType;     // CMP_WRC 등

    @Column(name = "observed_at_utc", nullable = false)
    private OffsetDateTime observedAtUtc;

    @Column(name = "observed_at_kst", nullable = false)
    private OffsetDateTime observedAtKst;

    @Column(name = "source_url", nullable = false, columnDefinition = "text")
    private String sourceUrl;

    @Column(name = "fetched_at", nullable = false)
    private OffsetDateTime fetchedAt;

    protected RadarImage() {
    }

    public RadarImage(String radarType,
                      OffsetDateTime observedAtUtc, OffsetDateTime observedAtKst,
                      String sourceUrl, OffsetDateTime fetchedAt) {
        this.radarType = radarType;
        this.observedAtUtc = observedAtUtc;
        this.observedAtKst = observedAtKst;
        this.sourceUrl = sourceUrl;
        this.fetchedAt = fetchedAt;
    }

    public Long getId() { return id; }
    public String getRadarType() { return radarType; }
    public OffsetDateTime getObservedAtUtc() { return observedAtUtc; }
    public OffsetDateTime getObservedAtKst() { return observedAtKst; }
    public String getSourceUrl() { return sourceUrl; }
    public OffsetDateTime getFetchedAt() { return fetchedAt; }
}
