package com.mairy.konbini.service.impl;

import com.mairy.konbini.dto.HealthResponse;
import com.mairy.konbini.mapper.DatabaseProbeMapper;
import com.mairy.konbini.service.HealthService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * 检查进程能否执行一条数据库查询。失败时不记录连接串。
 */
@Service
public class HealthServiceImpl implements HealthService {

    private static final Logger log = LoggerFactory.getLogger(HealthServiceImpl.class);

    private final DatabaseProbeMapper databaseProbeMapper;

    /**
     * 注入业务处理所需的依赖。
     */
    public HealthServiceImpl(DatabaseProbeMapper databaseProbeMapper) {
        this.databaseProbeMapper = databaseProbeMapper;
    }

    /**
     * 数据库可用时返回 ok，否则返回不可用。调用方据此选择 200 或 503。
     */
    @Override
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
