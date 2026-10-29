package com.eseict.ulsan.server.firewall.snmp;

/** BLUEMAX NGF 가 내놓는 OID. 시큐아이 전용(9560)은 2026-09-15 실측으로 뜻을 확인한 것이다. */
final class SecuiOid {

    private static final String SECUI = "1.3.6.1.4.1.9560.1.10.4";

    static final String UPTIME_SEC = SECUI + ".1.5.0";
    static final String SESSION_CNT = SECUI + ".1.3.1.0";
    static final String CPU_PCT = SECUI + ".3.1.1.6.0";        // 0 = 전체, 1~20 = 코어
    static final String MEM_TOTAL = SECUI + ".3.2.1.0";
    static final String MEM_USED = SECUI + ".3.2.2.0";
    static final String MEM_PCT = SECUI + ".3.2.4.0";
    static final String DISK_LOG_PCT = SECUI + ".3.3.6.0";     // /secui/log 946GB
    static final String DISK_SYS_PCT = SECUI + ".3.4.6.0";     // /usr 128GB
    static final String DISK_TMP_PCT = SECUI + ".3.5.6.0";     // /secui/tmp 51GB

    /** 인터페이스 표. 열: 2 이름, 3 zone, 4 "1Gbps^Full Duplex^on^UP^yes", 5 in bytes, 6 out bytes */
    static final String IF_TABLE = SECUI + ".2.1";
    static final String IF_NAME = IF_TABLE + ".2";
    static final String IF_ZONE = IF_TABLE + ".3";
    static final String IF_STATE = IF_TABLE + ".4";
    static final String IF_IN = IF_TABLE + ".5";
    static final String IF_OUT = IF_TABLE + ".6";

    /** 정책 표. 열: 3 이름, 5 패킷, 6 바이트, 7 세션, 10 마지막 매칭, 11 ALLOW/DENY */
    static final String POLICY_TABLE = SECUI + ".5.1";
    static final String POLICY_NAME = POLICY_TABLE + ".3";
    static final String POLICY_PACKETS = POLICY_TABLE + ".5";
    static final String POLICY_BYTES = POLICY_TABLE + ".6";
    static final String POLICY_SESSIONS = POLICY_TABLE + ".7";
    static final String POLICY_LAST_HIT = POLICY_TABLE + ".10";
    static final String POLICY_ACTION = POLICY_TABLE + ".11";

    /** lm-sensors. 온도 1~14 (4 = Package id 0 = CPU), 팬 15~20 (5·6 은 없는 슬롯이라 0) */
    static final String SENSOR_TEMP_CPU = "1.3.6.1.4.1.2021.13.16.2.1.3.4";   // 밀리도
    static final String SENSOR_FAN_TABLE = "1.3.6.1.4.1.2021.13.16.3.1.3";

    private SecuiOid() {
    }
}
