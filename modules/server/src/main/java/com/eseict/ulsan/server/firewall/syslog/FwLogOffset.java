package com.eseict.ulsan.server.firewall.syslog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Syslog 파일을 어디까지 읽었는지. 재기동해도 이어 읽는다. */
@Entity
@Table(name = "fw_log_offset", schema = "server")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FwLogOffset {

    @Id
    @Column(length = 255)
    private String path;

    @Column(name = "file_offset", nullable = false)
    private long fileOffset;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    FwLogOffset(String path, long fileOffset) {
        this.path = path;
        update(fileOffset);
    }

    void update(long fileOffset) {
        this.fileOffset = fileOffset;
        this.updatedAt = OffsetDateTime.now();
    }
}
