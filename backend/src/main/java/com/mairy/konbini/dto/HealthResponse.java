package com.mairy.konbini.dto;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

/**
 * 健康检查结果。database 只表示可用或不可用，不返回主机地址。
 */
@JsonPropertyOrder({"status", "database"})
public record HealthResponse(String status, String database) {
}
