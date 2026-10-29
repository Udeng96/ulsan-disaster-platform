package com.eseict.ulsan.slope.alarm.dto;

/** 지구별 발령 건수. 지도 버블 색에 쓴다 (0 / 1~2 / 3~5 / 6~9 / 10+). */
public record ZoneCount(String areaName, int count) {
}
