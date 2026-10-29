package com.eseict.ulsan.server.firewall.syslog;

import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** rsyslog 원문 한 줄 → FwLog. 형식: 수신시각 PRI 장비시각 [tag] [장비IP] CSV본문 */
final class FirewallSyslogParser {

    private static final Pattern LINE = Pattern.compile(
            "^(\\S+) <\\d+>1 (\\S+) \\[(\\w+)\\] \\[[\\d.]+\\] ?(.*)$");

    private FirewallSyslogParser() {
    }

    static Optional<FwLog> parse(String line) {
        Matcher m = LINE.matcher(line);
        if (!m.matches()) return Optional.empty();
        return Optional.of(FwLog.builder()
                .receivedAt(OffsetDateTime.parse(m.group(1)))
                .deviceAt(parseOrNull(m.group(2)))
                .tag(m.group(3))
                .body(m.group(4))
                .build());
    }

    private static OffsetDateTime parseOrNull(String s) {
        try {
            return OffsetDateTime.parse(s);
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
