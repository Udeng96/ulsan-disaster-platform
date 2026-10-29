package com.eseict.ulsan.server.firewall.snmp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** 정책 표가 바뀐 기록 한 줄. 직전 SNMP 정책 표와 비교해 달라졌을 때만 쌓는다. */
@Entity
@Table(name = "fw_policy_change", schema = "server")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FwPolicyChange {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "changed_at", nullable = false)
    private OffsetDateTime changedAt;

    @Column(name = "policy_count", nullable = false)
    private int policyCount;

    @Column(name = "allow_count", nullable = false)
    private int allowCount;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false, columnDefinition = "text[]")
    private String[] added;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false, columnDefinition = "text[]")
    private String[] removed;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "action_changed", nullable = false, columnDefinition = "text[]")
    private String[] actionChanged;

    public FwPolicyChange(OffsetDateTime changedAt, int policyCount, int allowCount,
                          List<String> added, List<String> removed, List<String> actionChanged) {
        this.changedAt = changedAt;
        this.policyCount = policyCount;
        this.allowCount = allowCount;
        this.added = added.toArray(String[]::new);
        this.removed = removed.toArray(String[]::new);
        this.actionChanged = actionChanged.toArray(String[]::new);
    }

    /** 최근 활동 한 줄. 예: 「정책 변경 · 추가 「웹서버 허용」 · 삭제 0」. */
    public String summary() {
        StringBuilder b = new StringBuilder("정책 변경 · 추가 ").append(names(added))
                .append(" · 삭제 ").append(names(removed));
        if (actionChanged.length > 0) {
            b.append(" · 허용/차단 바뀜 ").append(names(actionChanged));
        }
        return b.toString();
    }

    private static String names(String[] n) {
        if (n.length == 0) return "0";
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < n.length; i++) {
            if (i > 0) b.append(", ");
            b.append('「').append(n[i]).append('」');
        }
        return b.toString();
    }
}
