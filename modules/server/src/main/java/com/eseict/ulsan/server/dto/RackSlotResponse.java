package com.eseict.ulsan.server.dto;

import com.eseict.ulsan.server.domain.Verdict;

/** 섹션1(랙 그림)·섹션2(장비 13줄) 공용. shape A~G 는 섹션4 도면 7종과 같은 글자. */
public record RackSlotResponse(int seq, String host, String name, String shape, int rackU, Verdict verdict, String color, boolean directDot) {}
