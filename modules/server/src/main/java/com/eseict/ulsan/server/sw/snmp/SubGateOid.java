package com.eseict.ulsan.server.sw.snmp;

/** SG2428GX 가 내놓는 OID. 2026-09-22 덤프(switch_all.txt)로 확인. 온도·전원 항목은 없다. */
final class SubGateOid {

    static final String SYS_UPTIME = "1.3.6.1.2.1.1.3.0";                 // Timeticks (1/100초)
    static final String LOAD_1M = "1.3.6.1.4.1.2021.10.1.3.1";            // 문자열 "11.89"
    static final String MEM_TOTAL_KB = "1.3.6.1.4.1.27837.1.1.15.1.0";   // 한드림넷 전용
    static final String MEM_USED_KB = "1.3.6.1.4.1.27837.1.1.15.2.0";

    /** 인터페이스. 인덱스 5001=ge1 … 5024=ge24, 5025~5028=xe1~4 */
    static final String IF_DESCR = "1.3.6.1.2.1.2.2.1.2";
    static final String IF_OPER_STATUS = "1.3.6.1.2.1.2.2.1.8";           // 1=up
    static final String IF_HIGH_SPEED = "1.3.6.1.2.1.31.1.1.1.15";        // Mbps
    static final String IF_HC_IN = "1.3.6.1.2.1.31.1.1.1.6";
    static final String IF_HC_OUT = "1.3.6.1.2.1.31.1.1.1.10";
    static final String IF_IN_ERRORS = "1.3.6.1.2.1.2.2.1.14";            // 받기 에러 누적
    static final String IF_OUT_ERRORS = "1.3.6.1.2.1.2.2.1.20";           // 보내기 에러 누적
    static final String IF_HC_IN_UCAST = "1.3.6.1.2.1.31.1.1.1.7";        // 받은 유니캐스트 패킷 누적
    static final String IF_HC_IN_MCAST = "1.3.6.1.2.1.31.1.1.1.8";        // 받은 멀티캐스트 패킷 누적
    static final String IF_HC_IN_BCAST = "1.3.6.1.2.1.31.1.1.1.9";        // 받은 브로드캐스트 패킷 누적

    /** MAC 테이블. 인덱스 = MAC 6바이트를 10진수로, 값 = 포트(=ifIndex) */
    static final String FDB_PORT = "1.3.6.1.2.1.17.4.3.1.2";

    private SubGateOid() {
    }
}
