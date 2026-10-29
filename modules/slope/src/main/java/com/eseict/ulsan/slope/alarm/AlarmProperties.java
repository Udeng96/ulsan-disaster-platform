package com.eseict.ulsan.slope.alarm;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 발령 조회 설정 ({@code slope.alarm.*}).
 *
 * <p>{@code pendingLevels} 가 "발령 필요"로 볼 단계다. 기본은 주의 이상 — 관심은 매일 반복
 * 발송되어(8월 62건 중 60건) 포함하면 상시 표출된다. 담당 부서와 협의 후 바뀔 수 있어
 * 설정으로 뺐다.
 */
@ConfigurationProperties(prefix = "slope.alarm")
public record AlarmProperties(
        /** 발령 필요로 볼 단계 (한글 표기, 업체 snr_step 값) */
        List<String> pendingLevels,
        /** 우리가 다루는 지구. 업체 DB 에 창신고등학교지구·울산지구 등 남구 밖 데이터가 섞여 있다. */
        List<String> zones
) {
}
