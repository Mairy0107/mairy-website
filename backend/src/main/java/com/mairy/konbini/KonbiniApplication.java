package com.mairy.konbini;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 场景 API 入口。数据库密码只来自环境变量或本机 .env，不写进仓库。
 */
@SpringBootApplication
public class KonbiniApplication {

    /**
     * 启动 Web 服务。端口和监听地址由 PORT、LISTEN_HOST 决定。
     */
    public static void main(String[] args) {
        SpringApplication.run(KonbiniApplication.class, args);
    }
}
