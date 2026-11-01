package com.mairy.konbini.service;

import com.mairy.konbini.dto.HealthResponse;
import com.mairy.konbini.repository.DatabaseProbeMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * 检查进程能否执行一条数据库查询。失败时不记录连接串。
 */
@Service
public class HealthService {

    private static final Logger log = LoggerFactory.getLogger(HealthService.class);

    private final DatabaseProbeMapper databaseProbeMapper;

    public HealthService(DatabaseProbeMapper databaseProbeMapper) {
        this.databaseProbeMapper = databaseProbeMapper;
    }

    /**
     * 数据库可用时返回 ok，否则返回不可用。调用方据此选择 200 或 503。
     */
    public HealthResponse check() {
        try {
            Object value = databaseProbeMapper.ping();
            if (value instanceof Number number && number.intValue() == 1) {
                return new HealthResponse("ok", "ok");
            }
        } catch (RuntimeException ex) {
            log.warn("数据库健康检查失败: {}", ex.getClass().getSimpleName());
        }
        return new HealthResponse("error", "unavailable");
    }
}
