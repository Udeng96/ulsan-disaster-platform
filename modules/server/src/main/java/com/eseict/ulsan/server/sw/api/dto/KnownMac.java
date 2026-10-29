package com.eseict.ulsan.server.sw.api.dto;

import java.time.OffsetDateTime;

/** 아는 장비 한 줄. */
public record KnownMac(String mac, String ifName, String note, OffsetDateTime registeredAt) {
}
