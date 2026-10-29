package com.eseict.ulsan.server.common.snmp;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.snmp4j.PDU;
import org.snmp4j.ScopedPDU;
import org.snmp4j.Snmp;
import org.snmp4j.CommunityTarget;
import org.snmp4j.Target;
import org.snmp4j.UserTarget;
import org.snmp4j.event.ResponseEvent;
import org.snmp4j.mp.MPv3;
import org.snmp4j.mp.SnmpConstants;
import org.snmp4j.security.AuthHMAC192SHA256;
import org.snmp4j.security.PrivAES128;
import org.snmp4j.security.SecurityLevel;
import org.snmp4j.security.SecurityModels;
import org.snmp4j.security.SecurityProtocols;
import org.snmp4j.security.USM;
import org.snmp4j.security.UsmUser;
import org.snmp4j.smi.Address;
import org.snmp4j.smi.GenericAddress;
import org.snmp4j.smi.OID;
import org.snmp4j.smi.OctetString;
import org.snmp4j.smi.VariableBinding;
import org.snmp4j.smi.TimeTicks;
import org.snmp4j.smi.Variable;
import org.snmp4j.transport.DefaultUdpTransportMapping;
import org.snmp4j.util.DefaultPDUFactory;
import org.snmp4j.util.TreeEvent;
import org.snmp4j.util.TreeUtils;

/**
 * 장비에 상태를 물어보는 SNMPv3 클라이언트. 방화벽·스위치·서버 공용.
 * 값 주소(OID)를 주면 값을 문자열로 돌려주고, 그 값이 CPU 인지 포트인지는 장비별 코드가 해석한다.
 * v3(방화벽: SHA-256 / AES-128)과 v2c(스위치: 커뮤니티) 둘 다 된다.
 */
public class SnmpClient implements AutoCloseable {

    private final Snmp snmp;
    private final Target<Address> target;

    public SnmpClient(SnmpV3Target t) throws IOException {
        snmp = new Snmp(new DefaultUdpTransportMapping());
        USM usm = new USM(SecurityProtocols.getInstance().addDefaultProtocols(),
                new OctetString(MPv3.createLocalEngineID()), 0);
        SecurityModels.getInstance().addSecurityModel(usm);
        snmp.getUSM().addUser(new UsmUser(new OctetString(t.user()),
                AuthHMAC192SHA256.ID, new OctetString(t.authPassword()),
                PrivAES128.ID, new OctetString(t.privPassword())));
        snmp.listen();

        UserTarget<Address> ut = new UserTarget<>();
        ut.setAddress(GenericAddress.parse("udp:" + t.host() + "/" + t.port()));
        ut.setVersion(SnmpConstants.version3);
        ut.setSecurityLevel(SecurityLevel.AUTH_PRIV);
        ut.setSecurityName(new OctetString(t.user()));
        ut.setTimeout(t.timeoutMs());
        ut.setRetries(1);
        target = ut;
    }

    public SnmpClient(SnmpV2cTarget t) throws IOException {
        snmp = new Snmp(new DefaultUdpTransportMapping());
        snmp.listen();

        CommunityTarget<Address> ct = new CommunityTarget<>();
        ct.setAddress(GenericAddress.parse("udp:" + t.host() + "/" + t.port()));
        ct.setVersion(SnmpConstants.version2c);
        ct.setCommunity(new OctetString(t.community()));
        ct.setTimeout(t.timeoutMs());
        ct.setRetries(1);
        target = ct;
    }

    /** get: 주소를 정확히 아는 값 여러 개를 한 번에. 가동초·CPU·메모리처럼 주소가 고정인 것. 응답 없으면 IOException. */
    public Map<String, String> get(List<String> oids) throws IOException {
        PDU pdu = target instanceof UserTarget ? new ScopedPDU() : new PDU();
        pdu.setType(PDU.GET);
        oids.forEach(o -> pdu.add(new VariableBinding(new OID(o))));
        ResponseEvent<Address> ev = snmp.send(pdu, target);
        if (ev.getResponse() == null) {
            throw new IOException("SNMP 응답 없음: " + target.getAddress());
        }
        if (ev.getResponse().getErrorStatus() != PDU.noError || ev.getResponse().getType() == PDU.REPORT) {
            throw new IOException("SNMP GET 실패: " + ev.getResponse().getErrorStatusText());
        }
        Map<String, String> out = new LinkedHashMap<>();
        for (VariableBinding vb : ev.getResponse().getVariableBindings()) {
            if (vb.isException()) throw new IOException("SNMP OID 조회 불가: " + vb.getOid());
            out.put(vb.getOid().toDottedString(), valueOf(vb.getVariable()));
        }
        return out;
    }

    /** walk: 주소 앞부분만 주고 그 밑을 전부. 포트 표·정책 표처럼 줄 수가 변하는 것. 키는 전체 주소. */
    public Map<String, String> walk(String rootOid) throws IOException {
        TreeUtils tree = new TreeUtils(snmp, new DefaultPDUFactory());
        List<TreeEvent> events = tree.getSubtree(target, new OID(rootOid));
        Map<String, String> out = new LinkedHashMap<>();
        for (TreeEvent e : events) {
            if (e.isError()) {
                throw new IOException("SNMP walk 실패 " + rootOid + ": " + e.getErrorMessage());
            }
            VariableBinding[] vbs = e.getVariableBindings();
            if (vbs == null) continue;
            for (VariableBinding vb : vbs) {
                out.put(vb.getOid().toDottedString(), valueOf(vb.getVariable()));
            }
        }
        return out;
    }

    static String valueOf(Variable value) {
        return value instanceof TimeTicks ticks ? Long.toString(ticks.toLong()) : value.toString();
    }

    /** walk 결과에서 한 열만 [인덱스, 값] 로 추린다. 표의 "이름 열" 만 보고 싶을 때. */
    public static List<String[]> column(Map<String, String> walked, String columnOid) {
        String prefix = columnOid + ".";
        List<String[]> rows = new ArrayList<>();
        walked.forEach((oid, v) -> {
            if (oid.startsWith(prefix)) rows.add(new String[] {oid.substring(prefix.length()), v});
        });
        return rows;
    }

    @Override
    public void close() throws IOException {
        snmp.close();
    }
}
