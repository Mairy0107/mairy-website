package com.mairy.konbini.config;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

/**
 * 在读取 application.yml 之前装入 .env。系统环境变量优先，避免覆盖容器注入的密码。
 */
public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    static final String PROPERTY_SOURCE = "dotenvFile";

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
     * 放到系统环境变量之后，使已导出的变量覆盖文件中的同名项。
     */
    static void addLowerThanSystemEnvironment(ConfigurableEnvironment environment, Map<String, Object> values) {
        MapPropertySource source = new MapPropertySource(PROPERTY_SOURCE, values);
        if (environment.getPropertySources().contains(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME)) {
            environment.getPropertySources().addAfter(
                    StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                    source);
        } else {
            environment.getPropertySources().addLast(source);
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }
}
