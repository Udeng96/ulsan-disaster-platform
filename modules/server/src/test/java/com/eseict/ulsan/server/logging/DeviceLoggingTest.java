package com.eseict.ulsan.server.logging;

import static org.assertj.core.api.Assertions.assertThat;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.joran.JoranConfigurator;
import ch.qos.logback.classic.util.LogbackMDCAdapter;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class DeviceLoggingTest {
    @TempDir Path home;

    @Test
    void 장비별_파일에_분리하고_예외원인을_보존한다() throws Exception {
        LoggerContext context = new LoggerContext();
        context.setMDCAdapter(new LogbackMDCAdapter());
        context.putProperty("APP_HOME", home.toString());
        JoranConfigurator config = new JoranConfigurator();
        config.setContext(context);
        try {
            config.doConfigure(getClass().getResource("/logback-spring.xml"));
            context.getLogger("com.eseict.ulsan.server.firewall.snmp.FirewallSnmpCollector")
                    .info("FIREWALL_ONLY");
            context.getLogger("com.eseict.ulsan.server.sw.snmp.SwitchSnmpCollector")
                    .warn("SWITCH_ONLY", new IllegalStateException("SWITCH_CAUSE"));
            context.getLogger("com.zaxxer.hikari.HikariDataSource").info("COMMON_ONLY");
        } finally {
            context.stop();
        }
        String fw = Files.readString(home.resolve("logs/firewall.log"));
        String sw = Files.readString(home.resolve("logs/switch.log"));
        String common = Files.readString(home.resolve("logs/server.log"));
        assertThat(fw).contains("FIREWALL_ONLY").doesNotContain("SWITCH_ONLY", "COMMON_ONLY");
        assertThat(sw).contains("SWITCH_ONLY", "SWITCH_CAUSE").doesNotContain("FIREWALL_ONLY", "COMMON_ONLY");
        assertThat(common).contains("COMMON_ONLY").doesNotContain("FIREWALL_ONLY", "SWITCH_ONLY");
    }
}
