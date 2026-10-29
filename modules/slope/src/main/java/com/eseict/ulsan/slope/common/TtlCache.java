package com.eseict.ulsan.slope.common;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;
import lombok.extern.slf4j.Slf4j;

/**
 * 업체 DB 조회 결과 캐시.
 *
 * <p><b>화면이 업체 DB 를 직접 읽으므로 필요하다.</b> 업체 DB 는 망연계 너머라, 관제센터 화면이
 * 몇 대든 업체 조회가 키당 TTL 1회를 넘지 않게 한다.
 *
 * <ul>
 *   <li><b>동시 요청은 한 번만 조회한다.</b> 만료 순간 요청이 몰려도 같은 키는 한 스레드만 로더를
 *       실행하고 나머지는 그 결과를 받는다.</li>
 *   <li><b>조회가 실패하면 마지막 성공 값을 준다.</b> 망연계가 끊겨도 화면이 비지 않고, 재시도는
 *       TTL 뒤에 한다. 성공한 적이 없으면 예외를 그대로 던진다.</li>
 * </ul>
 */
@Slf4j
public class TtlCache<K, V> {

    private final Duration ttl;
    private final Map<K, Entry<V>> entries = new ConcurrentHashMap<>();
    private final Map<K, Object> locks = new ConcurrentHashMap<>();

    private record Entry<V>(V value, Instant loadedAt) {
    }

    public TtlCache(Duration ttl) {
        this.ttl = ttl;
    }

    public V get(K key, Supplier<V> loader) {
        Entry<V> cached = entries.get(key);
        if (isFresh(cached)) {
            return cached.value();
        }
        synchronized (locks.computeIfAbsent(key, k -> new Object())) {
            cached = entries.get(key);
            if (isFresh(cached)) {
                return cached.value();   // 기다리는 동안 다른 요청이 채웠다
            }
            try {
                V fresh = loader.get();
                entries.put(key, new Entry<>(fresh, Instant.now()));
                return fresh;
            } catch (RuntimeException e) {
                if (cached == null) {
                    throw e;
                }
                log.warn("업체 조회 실패 — 마지막 값({}) 사용: {}", cached.loadedAt(), e.getMessage());
                // TTL 동안은 다시 시도하지 않는다. 끊긴 망연계에 요청마다 붙지 않게.
                entries.put(key, new Entry<>(cached.value(), Instant.now()));
                return cached.value();
            }
        }
    }

    private boolean isFresh(Entry<V> entry) {
        return entry != null && entry.loadedAt().plus(ttl).isAfter(Instant.now());
    }
}
