package com.mairy.konbini.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 解析仓库根目录的 .env。只做文本拆分，不执行命令，也不记录变量值。
 */
public final class DotenvFile {

    private static final int MAX_BYTES = 256 * 1024;

    private DotenvFile() {
    }

    /**
     * 工作目录是仓库根时读取 .env；工作目录是 backend 时读取上一级 .env。
     */
    public static Path locate(Path workingDirectory) {
        Path cwd = workingDirectory.toAbsolutePath().normalize();
        Path direct = cwd.resolve(".env");
        if (Files.isRegularFile(direct)) {
            return direct;
        }
        if (cwd.getFileName() != null && "backend".equals(cwd.getFileName().toString()) && cwd.getParent() != null) {
            Path parent = cwd.getParent().resolve(".env");
            if (Files.isRegularFile(parent)) {
                return parent;
            }
        }
        return null;
    }

    /**
     * 把 KEY=VALUE 解析成有序映射。已存在的系统环境变量不会在这里被覆盖。
     */
    public static Map<String, Object> parse(String content) {
        Map<String, Object> values = new LinkedHashMap<>();
        String normalized = content.startsWith("\uFEFF") ? content.substring(1) : content;
        for (String rawLine : normalized.split("\\R", -1)) {
            String line = rawLine.trim();
            if (line.isEmpty() || line.startsWith("#")) {
                continue;
            }
            if (line.startsWith("export ")) {
                line = line.substring("export ".length()).trim();
            }
            int separator = line.indexOf('=');
            if (separator <= 0) {
                continue;
            }
            String key = line.substring(0, separator).trim();
            if (key.isEmpty() || key.chars().anyMatch(ch -> ch == ' ' || ch == '#')) {
                continue;
            }
            values.put(key, unquote(line.substring(separator + 1).trim()));
        }
        return values;
    }

    /**
     * 读取文件。文件过大时返回空映射，避免把异常内容带进启动日志。
     */
    public static Map<String, Object> read(Path file) throws IOException {
        if (Files.size(file) > MAX_BYTES) {
            return Map.of();
        }
        return parse(Files.readString(file, StandardCharsets.UTF_8));
    }

    private static String unquote(String value) {
        if (value.length() >= 2) {
            char first = value.charAt(0);
            char last = value.charAt(value.length() - 1);
            if ((first == '"' || first == '\'') && first == last) {
                return value.substring(1, value.length() - 1);
            }
        }
        return value;
    }
}
