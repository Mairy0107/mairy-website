package com.mairy.konbini.controller;

import com.mairy.konbini.dto.HealthResponse;
import com.mairy.konbini.service.HealthService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 健康检查。数据库不通时返回 503，响应里不出现主机或账号。
 */
@RestController
public class HealthController {

    private final HealthService healthService;

    public HealthController(HealthService healthService) {
        this.healthService = healthService;
    }

    /**
     * 同时表示进程和数据库是否可用。
     */
    @GetMapping("/api/health")
    public ResponseEntity<HealthResponse> health() {
        HealthResponse body = healthService.check();
        HttpStatus status = "ok".equals(body.status()) ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
        return ResponseEntity.status(status).body(body);
    }
}
