package com.eseict.ulsan.server.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/** 자산대장 「기술 사양」 탭. 하드웨어가 바뀔 때만 바뀐다. 실측값과 규격서값을 나란히 둔다(불일치가 곧 발견 사항). */
@Entity
@Table(name = "server_specs", schema = "server")
public class ServerSpec {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "server_id", nullable = false, unique = true)
    private Server server;

    @Column(length = 64) private String os;
    @Column(length = 128) private String kernel;
    @Column(name = "cpu_measured", length = 128) private String cpuMeasured;
    @Column(name = "cpu_spec", length = 128) private String cpuSpec;
    @Column(name = "sockets_cores", length = 32) private String socketsCores;
    @Column(name = "ram_measured", length = 128) private String ramMeasured;
    @Column(name = "ram_spec", length = 64) private String ramSpec;
    @Column(name = "storage_logical", length = 255) private String storageLogical;
    @Column(name = "storage_physical", length = 255) private String storagePhysical;
    @Column(length = 255) private String raid;
    @Column(length = 255) private String nic;
    @Column(length = 255) private String power;
    @Column(length = 255) private String apps;
    @Column(length = 255) private String backup;
    @Column(columnDefinition = "text") private String note;

    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    protected ServerSpec() {}

    public Long getId() { return id; }
    public Server getServer() { return server; }
    public String getOs() { return os; }
    public String getKernel() { return kernel; }
    public String getCpuMeasured() { return cpuMeasured; }
    public String getCpuSpec() { return cpuSpec; }
    public String getSocketsCores() { return socketsCores; }
    public String getRamMeasured() { return ramMeasured; }
    public String getRamSpec() { return ramSpec; }
    public String getStorageLogical() { return storageLogical; }
    public String getStoragePhysical() { return storagePhysical; }
    public String getRaid() { return raid; }
    public String getNic() { return nic; }
    public String getPower() { return power; }
    public String getApps() { return apps; }
    public String getBackup() { return backup; }
    public String getNote() { return note; }
}
