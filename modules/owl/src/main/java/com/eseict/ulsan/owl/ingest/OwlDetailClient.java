package com.eseict.ulsan.owl.ingest;

import com.eseict.ulsan.owl.ingest.dto.OwlRawMessage;
import java.util.Set;
import org.springframework.stereotype.Component;

/** Public boundary for an independently supplied detail adapter. No vendor SDK is bundled. */
@Component
public class OwlDetailClient {
    public OwlRawMessage get(String msgId, String msgSn) {
        throw new UnsupportedOperationException("Provide a synthetic detail adapter for this source sample");
    }
    public void retainOnly(Set<String> keys) { }
}
