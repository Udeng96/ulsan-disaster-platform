package com.eseict.ulsan.gis.common.web;

/**
 * 공통 에러 응답 — 모든 API 의 실패 응답 바디.
 *
 * <pre>{@code { "code": "NOT_FOUND", "message": "template not found: 3" }}</pre>
 *
 * @param code    에러 종류 (BAD_REQUEST / NOT_FOUND / METHOD_NOT_ALLOWED / SEARCH_UNAVAILABLE / INTERNAL_ERROR 등)
 * @param message 사람이 읽을 설명
 */
public record ErrorResponse(String code, String message) {}
