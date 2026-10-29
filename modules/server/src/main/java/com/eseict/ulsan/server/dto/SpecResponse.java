package com.eseict.ulsan.server.dto;

import com.eseict.ulsan.server.entity.Server;
import com.eseict.ulsan.server.entity.ServerSpec;

/** 자산대장 「기술 사양」 19열 (v3.0 확정). */
public record SpecResponse(
        int seq, String name, String host, String ip,
        String os, String kernel,
        String cpuMeasured, String cpuSpec, String socketsCores,
        String ramMeasured, String ramSpec,
        String storageLogical, String storagePhysical, String raid,
        String nic, String power, String apps, String backup, String note) {

    public static SpecResponse from(Server s, ServerSpec p) {
        if (p == null) {
            return new SpecResponse(s.getSeq(), s.getName(), s.getHost(), s.getIp(), null, null, null, null, null, null, null,
                    null, null, null, null, null, null, null, null);
        }
        return new SpecResponse(s.getSeq(), s.getName(), s.getHost(), s.getIp(), p.getOs(), p.getKernel(), p.getCpuMeasured(),
                p.getCpuSpec(), p.getSocketsCores(), p.getRamMeasured(), p.getRamSpec(), p.getStorageLogical(), p.getStoragePhysical(),
                p.getRaid(), p.getNic(), p.getPower(), p.getApps(), p.getBackup(), p.getNote());
    }
}
