package com.eseict.ulsan.server.common.snmp;

/** SNMPv3 authPriv 접속 정보. 장비마다 하나. */
public record SnmpV3Target(String host, int port, String user, String authPassword, String privPassword, int timeoutMs) {
}
