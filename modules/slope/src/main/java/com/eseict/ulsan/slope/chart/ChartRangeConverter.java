package com.eseict.ulsan.slope.chart;

import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

/**
 * {@code ?range=realtime} 처럼 소문자로 오는 값을 {@link ChartRange} 로 변환한다.
 *
 * <p>Spring 기본 enum 변환은 대소문자를 가려 소문자를 그대로 넘기면 400 이 난다. 화면은
 * 소문자를 쓰고 응답의 {@code range} 필드도 소문자로 내려가므로, 요청도 소문자로 받는 게 맞다.
 *
 * <p>여기서 {@link IllegalArgumentException} 을 던지면 Spring 이 400 으로 바꿔준다 —
 * 컨트롤러에서 직접 변환하면 500 이 되므로 컨버터로 둔다.
 */
@Component
public class ChartRangeConverter implements Converter<String, ChartRange> {

    @Override
    public ChartRange convert(String source) {
        return ChartRange.valueOf(source.trim().toUpperCase());
    }
}
