package com.mairy.konbini.repository;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Configuration;

/**
 * 注册本包中的 Mapper。放在独立配置里，避免接口层测试拉起数据库。
 */
@Configuration
@MapperScan("com.mairy.konbini.repository")
public class MyBatisRepositoryConfig {
}
