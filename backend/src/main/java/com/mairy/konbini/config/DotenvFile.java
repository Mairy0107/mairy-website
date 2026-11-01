package com.mairy.konbini.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 定位并解析本地 .env。只做文本拆分，不执行命令，也不记录变量值。
 */
public final class DotenvFile {

    private static final int MAX_BYTES = 256 * 1024;

    private DotenvFile() {
    }

    /**
     * 从工作目录逐级向上查找，优先同目录 .env，其次 backend/.env。
     */
    public static Path locate(Path workingDirectory) {
        Path directory = workingDirectory.toAbsolutePath().normalize();
        while (directory != null) {
            Path direct = directory.resolve(".env");
            if (Files.isRegularFile(direct)) {
                return direct;
            }
            Path backend = directory.resolve("backend").resolve(".env");
            if (Files.isRegularFile(backend)) {
                return backend;
            }
            // 到达仓库边界后停止，避免误读仓库外的同名文件。
            if (Files.exists(directory.resolve(".git"))) {
                break;
            }
            directory = directory.getParent();
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
