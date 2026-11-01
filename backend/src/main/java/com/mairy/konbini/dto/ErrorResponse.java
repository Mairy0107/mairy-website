package com.mairy.konbini.dto;

/**
 * 错误响应。只包含给页面看的中文说明，不包含数据库或环境细节。
 */
public record ErrorResponse(String error) {
}
