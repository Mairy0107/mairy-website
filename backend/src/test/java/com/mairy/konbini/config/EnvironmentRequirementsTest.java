package com.mairy.konbini.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.DefaultBootstrapContext;
import org.springframework.boot.env.EnvironmentPostProcessorsFactory;
import org.springframework.boot.logging.DeferredLogs;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;

/**
 * 环境变量和 .env 的读取规则。断言里不放真实密码。
 */
class EnvironmentRequirementsTest {

    @Test
    void reportsOnlyTheMissingVariableName() {
        Map<String, String> values = new HashMap<>();
        values.put("MYSQL_HOST", "db.example");
        values.put("MYSQL_USER", "app");
        values.put("MYSQL_DATABASE", "test_01");
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> EnvironmentRequirements.check(values::get));
        assertEquals("缺少环境变量 MYSQL_PASSWORD", error.getMessage());
        assertFalse(error.getMessage().contains("db.example"));
    }

    @Test
    void rejectsAnInvalidPortWithoutEchoingOtherSettings() {
        Map<String, String> values = new HashMap<>();
        values.put("MYSQL_HOST", "db.example");
        values.put("MYSQL_USER", "app");
        values.put("MYSQL_PASSWORD", "placeholder");
        values.put("MYSQL_DATABASE", "test_01");
        values.put("PORT", "3001abc");
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> EnvironmentRequirements.check(values::get));
        assertEquals("PORT 端口无效", error.getMessage());
        assertFalse(error.getMessage().contains("placeholder"));
    }

    @Test
    void parsesDotenvWithoutDroppingCharactersAfterHash() {
        Map<String, Object> values = DotenvFile.parse("""
                # comment
                export MYSQL_HOST=db.example
                MYSQL_PASSWORD="not-printed"
                MYSQL_USER=app#reader
                """);
        assertEquals("db.example", values.get("MYSQL_HOST"));
        assertEquals("not-printed", values.get("MYSQL_PASSWORD"));
        assertEquals("app#reader", values.get("MYSQL_USER"));
    }

    /** 验证 JVM 系统属性仍优先于文件配置。 */
    @Test
    void existingEnvironmentWinsOverDotenv() {
        String previous = System.getProperty("MYSQL_HOST");
        System.setProperty("MYSQL_HOST", "from-env");
        try {
            StandardEnvironment environment = new StandardEnvironment();
            DotenvEnvironmentPostProcessor.addLowerThanSystemEnvironment(environment, Map.of(
                    "MYSQL_HOST", "from-file",
                    "MYSQL_USER", "file-user"));
            assertEquals("from-env", environment.getProperty("MYSQL_HOST"));
            assertEquals("file-user", environment.getProperty("MYSQL_USER"));
        } finally {
            if (previous == null) {
                System.clearProperty("MYSQL_HOST");
            } else {
                System.setProperty("MYSQL_HOST", previous);
            }
        }
    }

    /** 验证仓库根目录与 backend 工作目录均能找到根目录配置。 */
    @Test
    void findsEnvBesideTheBackendModule(@TempDir Path root) throws Exception {
        Path env = root.resolve(".env");
        Files.writeString(env, "MYSQL_DATABASE=test_01\n");
        Path backend = Files.createDirectory(root.resolve("backend"));
        assertEquals(env, DotenvFile.locate(backend));
        assertEquals(env, DotenvFile.locate(root));
        assertTrue(DotenvFile.read(env).containsKey("MYSQL_DATABASE"));
    }

    /** 验证空串和纯空白系统环境变量均不会遮蔽文件配置。 */
    @Test
    void blankSystemEnvironmentFallsBackToDotenv() {
        Map<String, Object> values = Map.of(
                "MYSQL_HOST", "db.example", "MYSQL_USER", "app",
                "MYSQL_PASSWORD", "placeholder", "MYSQL_DATABASE", "test_01",
                "MYSQL_PORT", "3306", "PORT", "3001", "LISTEN_HOST", "127.0.0.1");
        for (String blank : new String[] { "", " \t " }) {
            Map<String, Object> systemValues = new HashMap<>();
            values.keySet().forEach(key -> systemValues.put(key, blank));
            StandardEnvironment environment = isolatedEnvironment(systemValues);
            DotenvEnvironmentPostProcessor.addLowerThanSystemEnvironment(environment, values);
            values.forEach((key, value) -> assertEquals(value, environment.getProperty(key)));
            EnvironmentRequirements.check(environment::getProperty);
        }
    }

    /** 验证真实系统环境属性源的非空值和宽松名称解析保持优先。 */
    @Test
    void nonBlankSystemEnvironmentWinsOverDotenv() {
        StandardEnvironment environment = isolatedEnvironment(Map.of("MYSQL_HOST", "from-process"));
        DotenvEnvironmentPostProcessor.addLowerThanSystemEnvironment(environment, Map.of(
                "MYSQL_HOST", "from-file", "MYSQL_USER", "file-user"));
        assertEquals("from-process", environment.getProperty("MYSQL_HOST"));
        assertEquals("from-process", environment.getProperty("mysql.host"));
        assertEquals("file-user", environment.getProperty("MYSQL_USER"));
    }

    /** 验证同目录 .env 优先于父目录配置。 */
    @Test
    void prefersBackendEnvWhenBothFilesExist(@TempDir Path root) throws Exception {
        Files.writeString(root.resolve(".env"), "MYSQL_DATABASE=root_fixture\n");
        Path backend = Files.createDirectory(root.resolve("backend"));
        Path env = Files.writeString(backend.resolve(".env"), "MYSQL_DATABASE=backend_fixture\n");
        assertEquals(env, DotenvFile.locate(backend));
        assertEquals(root.resolve(".env"), DotenvFile.locate(root));
    }

    /** 验证仅 backend 存在配置时，从仓库根目录也可启动。 */
    @Test
    void findsBackendEnvFromRepoRoot(@TempDir Path root) throws Exception {
        Path backend = Files.createDirectory(root.resolve("backend"));
        Path env = Files.writeString(backend.resolve(".env"), "MYSQL_DATABASE=test_01\n");
        assertEquals(env, DotenvFile.locate(root));
        assertEquals(env, DotenvFile.locate(backend));
    }

    /** 验证 IDEA 使用模块内层目录时可以向上查找配置。 */
    @Test
    void findsEnvFromNestedWorkingDirectory(@TempDir Path root) throws Exception {
        Path env = Files.writeString(root.resolve(".env"), "MYSQL_DATABASE=test_01\n");
        Path nested = Files.createDirectories(root.resolve("backend/src/main"));
        assertEquals(env, DotenvFile.locate(nested));
    }

    /** 验证仓库无配置时不会继续读取仓库外的 .env。 */
    @Test
    void stopsAtRepositoryBoundary(@TempDir Path parent) throws Exception {
        Files.writeString(parent.resolve(".env"), "MYSQL_DATABASE=outside_fixture\n");
        Path root = Files.createDirectory(parent.resolve("repo"));
        Files.createDirectory(root.resolve(".git"));
        Path nested = Files.createDirectories(root.resolve("backend/src"));
        assertNull(DotenvFile.locate(nested));
    }

    /** 验证实际 Spring Boot 版本能发现处理器，避免打包后未加载配置。 */
    @Test
    void springBootDiscoversDotenvPostProcessor() {
        var processors = EnvironmentPostProcessorsFactory.fromSpringFactories(getClass().getClassLoader())
                .getEnvironmentPostProcessors(new DeferredLogs(), new DefaultBootstrapContext());
        assertTrue(processors.stream().anyMatch(DotenvEnvironmentPostProcessor.class::isInstance));
    }

    /** 隔离本机配置，仅模拟 Spring 实际使用的系统环境属性源。 */
    private StandardEnvironment isolatedEnvironment(Map<String, Object> systemValues) {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
        environment.getPropertySources().replace(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                new SystemEnvironmentPropertySource(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                        systemValues));
        return environment;
    }
}
