package com.eseict.ulsan.slope.facility;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 지구 단계 이력 한 건 — 한 지구가 한 단계에 머문 구간.
 *
 * <p>단계는 상단 지역 탭과 같다 — 업체 지구 상태와 발령 필요 단계 중 높은 것 (2026-10-14 사용자 결정).
 * 수집기가 매분 보고 바뀔 때만 구간을 닫고 새로 연다 ({@code AreaLevelTracker}). 정상은 행을 만들지
 * 않는다 — 진행 중인 구간이 닫히는 것으로 남는다.
 *
 * <p>화면 「발령 이력」({@code /alarms/history})은 구간 한 건을 한 줄로, 단계 변화 이력
 * ({@code /area-events})은 구간의 시작(과 정상으로 닫힌 끝)을 변화 한 건으로 보여준다.
 */
@Entity
@Table(name = "area_level_event", schema = "slope")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AreaLevelEvent {

    /** 격상. */
    public static final String UP = "UP";

    /** 격하. */
    public static final String DOWN = "DOWN";

    private static final int CAUSES_MAX = 500;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "area_id", nullable = false)
    private Long areaId;

    /** 이 구간의 단계. 업체 코드. */
    @Column(nullable = false, length = 20)
    private String level;

    /** 직전 단계. 정상에서 올라왔으면 NORMAL. */
    @Column(name = "prev_level", nullable = false, length = 20)
    private String prevLevel;

    @Column(nullable = false, length = 10)
    private String direction;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    /** 다른 단계나 정상으로 바뀐 시각. null 이면 진행 중. */
    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    /** 원인 계측기(업체 이름), 쉼표 구분. 구간 동안 나온 것을 모두 모은다. */
    @Column(length = CAUSES_MAX)
    private String causes;

    /** 구간 동안 받은 마지막 업체 발령 필요 문자 시각. 없으면 null. */
    @Column(name = "last_sent_at")
    private LocalDateTime lastSentAt;

    /** 구간 동안 받은 업체 발령 필요 문자 수. */
    @Column(name = "send_count", nullable = false)
    private int sendCount;

    /**
     * 실제 발령 여부. 발령은 구간이 열린 <i>뒤에</i> 담당자가 하는 것이라 처음에는 늘 false 이고,
     * 업체 {@code snr_isnc_log} 에 대응 발령이 나타나면 {@link #markIssued} 로 채운다.
     */
    @Column(nullable = false)
    private boolean issued;

    /** 발령자 이름. 업체 {@code snr_isnc_log.usr_nm}. */
    @Column(length = 50)
    private String issuer;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    /**
     * @param sentAt 이 구간을 연 업체 문자 시각. 문자 없이 열렸으면(격하·지구 상태) null
     */
    public AreaLevelEvent(Long areaId, String level, String prevLevel, LocalDateTime startedAt,
                          LocalDateTime sentAt, List<String> causes) {
        this.areaId = areaId;
        this.level = level;
        this.prevLevel = prevLevel;
        this.direction = LevelName.isWorse(level, prevLevel) ? UP : DOWN;
        this.startedAt = startedAt;
        if (sentAt != null) {
            this.lastSentAt = sentAt;
            this.sendCount = 1;
        }
        addCauses(causes);
    }

    /**
     * 같은 단계가 이어지는 동안 매분 부른다. 새 문자가 왔으면 횟수를 늘리고 원인을 모은다.
     *
     * @param sentAt 지금 보이는 가장 최근 문자 시각. 이 구간 시작 전 문자는 세지 않는다
     */
    public void observe(LocalDateTime sentAt, List<String> causes) {
        boolean changed = false;
        if (sentAt != null && !sentAt.isBefore(startedAt)
                && (lastSentAt == null || sentAt.isAfter(lastSentAt))) {
            this.lastSentAt = sentAt;
            this.sendCount++;
            changed = true;
        }
        changed |= addCauses(causes);
        if (changed) {
            this.updatedAt = LocalDateTime.now();
        }
    }

    /** 다른 단계나 정상으로 바뀌었다. */
    public void end(LocalDateTime at) {
        this.endedAt = at.isBefore(startedAt) ? startedAt : at;
        this.updatedAt = LocalDateTime.now();
    }

    public boolean isOpen() {
        return endedAt == null;
    }

    /**
     * 이 구간에 대응하는 발령을 찾았을 때 채운다. 한 번 채우면 다시 건드리지 않는다.
     */
    public void markIssued(String issuer) {
        this.issued = true;
        this.issuer = issuer;
        this.updatedAt = LocalDateTime.now();
    }

    /** 원인 목록 문자열 → 이름들. */
    public List<String> causeList() {
        return causes == null ? List.of() : List.of(causes.split(", "));
    }

    private boolean addCauses(List<String> more) {
        if (more == null || more.isEmpty()) {
            return false;
        }
        Set<String> all = new LinkedHashSet<>(causeList());
        if (!all.addAll(more)) {
            return false;
        }
        String joined = String.join(", ", all);
        this.causes = joined.length() > CAUSES_MAX ? joined.substring(0, CAUSES_MAX) : joined;
        return true;
    }
}
