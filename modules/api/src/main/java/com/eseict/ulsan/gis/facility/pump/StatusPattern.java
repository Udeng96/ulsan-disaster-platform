package com.eseict.ulsan.gis.facility.pump;

/**
 * 펌프장 장비의 상태 표시 패턴.
 *
 * <ul>
 *   <li>{@link #ON_OFF}      — 켜짐/꺼짐 (펌프 등)</li>
 *   <li>{@link #OPEN_CLOSE}  — 열림/닫힘 (밸브, 수문 등)</li>
 *   <li>{@link #WATER_LEVEL} — 수위 (수치값)</li>
 *   <li>{@link #NONE}        — 상태 없음 (PLC 자체 등)</li>
 * </ul>
 */
public enum StatusPattern {
    ON_OFF,
    OPEN_CLOSE,
    WATER_LEVEL,
    NONE
}
