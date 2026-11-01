package com.mairy.konbini.service;

import com.mairy.konbini.dto.HealthResponse;

/**
 * 健康检查接口，汇总进程与数据库的可用状态。
 */
public interface HealthService {

    /**
     * 检查数据库连通性，返回不含连接信息的健康状态。
     */
    HealthResponse check();
}
