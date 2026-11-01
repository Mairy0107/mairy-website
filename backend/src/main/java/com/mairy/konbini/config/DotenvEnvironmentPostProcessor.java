package com.mairy.konbini.config;

import java.io.IOException;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;

/**
 * 装入本地 .env，非空系统环境变量优先，且不记录任何配置值。
 */
public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    static final String PROPERTY_SOURCE = "dotenvFile";

    /** 加载工作目录附近的配置，并为监听地址提供本地默认值。 */
    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Path file = DotenvFile.locate(Path.of(System.getProperty("user.dir", ".")));
        if (file != null && !environment.getPropertySources().contains(PROPERTY_SOURCE)) {
            try {
                addLowerThanSystemEnvironment(environment, DotenvFile.read(file));
            } catch (IOException ex) {
                throw new IllegalStateException("无法读取 .env");
            }
        }
        if (isBlank(environment.getProperty("LISTEN_HOST"))) {
            environment.getPropertySources().addFirst(new MapPropertySource(
                    "listenHostDefault",
                    Map.of("LISTEN_HOST", "127.0.0.1")));
        }
    }

    /**
     * 忽略空白系统环境变量，再把文件配置放在非空系统环境变量之后。
     */
    static void addLowerThanSystemEnvironment(ConfigurableEnvironment environment, Map<String, Object> values) {
        String systemSourceName = StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME;
        if (environment.getPropertySources().get(systemSourceName)
                instanceof SystemEnvironmentPropertySource systemEnvironment) {
            // 仅过滤 Spring 的属性源，不修改进程或 Windows 持久环境变量。
            Map<String, Object> nonBlankValues = new LinkedHashMap<>();
            systemEnvironment.getSource().forEach((key, value) -> {
                if (!(value instanceof String text) || !text.isBlank()) {
                    nonBlankValues.put(key, value);
                }
            });
            // 保留系统环境变量的宽松名称解析，例如 mysql.host -> MYSQL_HOST。
            environment.getPropertySources().replace(systemSourceName,
                    new SystemEnvironmentPropertySource(systemSourceName, nonBlankValues));
        }
        MapPropertySource source = new MapPropertySource(PROPERTY_SOURCE, values);
        if (environment.getPropertySources().contains(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME)) {
            environment.getPropertySources().addAfter(
                    StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                    source);
        } else {
            environment.getPropertySources().addLast(source);
        }
    }

    /** 判断配置是否缺失或仅包含空白。 */
    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    /** 在其他环境处理器完成后补充本地配置。 */
    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }
}
