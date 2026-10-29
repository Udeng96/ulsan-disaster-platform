package com.eseict.ulsan.server.common;

import java.time.Instant;

/** 오류 응답 한 모양. 화면은 message 만 보여 주면 된다. */
public record ApiError(int status, String error, String message, String path, Instant timestamp) {}
