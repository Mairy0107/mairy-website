package com.mairy.konbini.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.core.env.StandardEnvironment;

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

    @Test
    void findsEnvBesideTheBackendModule() throws Exception {
        Path root = Files.createTempDirectory("konbini-env");
        Path env = root.resolve(".env");
        Files.writeString(env, "MYSQL_DATABASE=test_01\n");
        Path backend = Files.createDirectory(root.resolve("backend"));
        assertEquals(env, DotenvFile.locate(backend));
        assertEquals(env, DotenvFile.locate(root));
        assertTrue(DotenvFile.read(env).containsKey("MYSQL_DATABASE"));
    }
}
