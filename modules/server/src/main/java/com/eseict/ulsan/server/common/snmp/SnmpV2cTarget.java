package com.eseict.ulsan.server.common.snmp;

/** SNMP v2c 접속 정보. 커뮤니티 이름이 곧 비밀번호다. */
public record SnmpV2cTarget(String host, int port, String community, int timeoutMs) {
}
