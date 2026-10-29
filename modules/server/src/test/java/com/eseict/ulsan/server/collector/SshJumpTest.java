package com.eseict.ulsan.server.collector;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.eseict.ulsan.server.config.MonitorProperties;
import com.eseict.ulsan.server.domain.MeasureMode;
import com.eseict.ulsan.server.domain.ResourceLayout;
import com.eseict.ulsan.server.domain.Snapshot;
import com.eseict.ulsan.server.entity.Server;
import com.eseict.ulsan.server.host.live.HostLiveService;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.sshd.common.config.keys.writer.openssh.OpenSSHKeyPairResourceWriter;
import org.apache.sshd.common.session.Session;
import org.apache.sshd.common.util.net.SshdSocketAddress;
import org.apache.sshd.server.SshServer;
import org.apache.sshd.server.auth.pubkey.AcceptAllPublickeyAuthenticator;
import org.apache.sshd.server.forward.AcceptAllForwardingFilter;
import org.apache.sshd.server.keyprovider.SimpleGeneratorHostKeyProvider;
import org.apache.sshd.server.Environment;
import org.apache.sshd.server.ExitCallback;
import org.apache.sshd.server.channel.ChannelSession;
import org.apache.sshd.server.command.Command;
import java.io.InputStream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** 12번처럼 다른 서버(9번)를 거쳐 들어가는 접속 — 이 PC 안에 SSH 서버 두 개를 띄워 확인한다. */
class SshJumpTest {

    @TempDir Path dir;
    private SshServer jump, target;
    private SshCollector collector;
    private final AtomicInteger forwarded = new AtomicInteger();

    @AfterEach
    void stop() throws Exception {
        if (collector != null) collector.close();
        if (target != null) target.stop(true);
        if (jump != null) jump.stop(true);
    }

    @Test
    void 거쳐_가는_서버를_통해_명령을_실행한다() throws Exception {
        jump = server(false);
        jump.setForwardingFilter(new AcceptAllForwardingFilter() {
            @Override
            public boolean canConnect(Type type, SshdSocketAddress address, Session session) {
                forwarded.incrementAndGet();
                return true;
            }
        });
        jump.start();
        target = server(true);
        target.start();

        KeyPairGenerator g = KeyPairGenerator.getInstance("EC");
        g.initialize(256);
        KeyPair kp = g.generateKeyPair();
        Path key = dir.resolve("admin-ro");
        try (OutputStream out = Files.newOutputStream(key)) {
            OpenSSHKeyPairResourceWriter.INSTANCE.writePrivateKey(kp, null, null, out);
        }

        var nine = new MonitorProperties.Ssh.Target("intlinksvr", "127.0.0.1", jump.getPort(), null, null);
        var twelve = new MonitorProperties.Ssh.Target("extlinksvr", "127.0.0.1", target.getPort(), "intlinksvr", null);
        var ssh = new MonitorProperties.Ssh(true, System.getProperty("user.name"), key.toString(), Duration.ofSeconds(10), List.of(nine, twelve));
        var props = new MonitorProperties(new MonitorProperties.Collector(Duration.ofSeconds(60), "live", null, ssh), null);
        HostLiveService live = mock(HostLiveService.class);
        collector = new SshCollector(props, Clock.systemUTC(), live);

        Server s = mock(Server.class);
        when(s.getHost()).thenReturn("extlinksvr");
        when(s.getMeasureMode()).thenReturn(MeasureMode.DIRECT);
        when(s.getResourceLayout()).thenReturn(ResourceLayout.SERVER_NET);

        Optional<Snapshot> snap = collector.collect(s);

        assertThat(snap).isPresent();
        assertThat(snap.get().uptimeDays()).isNotNull();      // /proc/uptime 을 실제로 읽음
        assertThat(forwarded.get()).isEqualTo(1);              // 9번을 거쳐 들어감
        verify(live).record(eq("extlinksvr"), any());
    }

    private SshServer server(boolean shell) {
        SshServer sv = SshServer.setUpDefaultServer();
        sv.setHost("127.0.0.1");
        sv.setPort(0);
        sv.setKeyPairProvider(new SimpleGeneratorHostKeyProvider(dir.resolve((shell ? "t" : "j") + "-host.ser")));
        sv.setPublickeyAuthenticator(AcceptAllPublickeyAuthenticator.INSTANCE);
        if (shell) sv.setCommandFactory((channel, command) -> new Sh(command));
        return sv;
    }

    /** OpenSSH 처럼 /bin/sh -c 로 실행하고 끝 상태를 돌려준다. */
    static class Sh implements Command {
        private final String command;
        private OutputStream out, err;
        private ExitCallback exit;

        Sh(String command) { this.command = command; }

        @Override public void setInputStream(InputStream in) { }
        @Override public void setOutputStream(OutputStream out) { this.out = out; }
        @Override public void setErrorStream(OutputStream err) { this.err = err; }
        @Override public void setExitCallback(ExitCallback callback) { this.exit = callback; }
        @Override public void destroy(ChannelSession channel) { }

        @Override
        public void start(ChannelSession channel, Environment env) {
            new Thread(() -> {
                int code = 1;
                try {
                    Process p = new ProcessBuilder("/bin/sh", "-c", command).start();
                    p.getInputStream().transferTo(out);
                    p.getErrorStream().transferTo(err);
                    code = p.waitFor();
                    out.flush();
                    err.flush();
                } catch (Exception ignore) { }
                exit.onExit(code);
            }).start();
        }
    }
}
