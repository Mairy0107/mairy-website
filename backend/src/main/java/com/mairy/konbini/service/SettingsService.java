package com.mairy.konbini.service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.mairy.konbini.entity.SceneSettingEntity;
import com.mairy.konbini.exception.InvalidInteractionException;
import com.mairy.konbini.exception.StoredJsonException;
import com.mairy.konbini.repository.SceneSettingMapper;

import org.springframework.stereotype.Service;

/**
 * 场景设置读写。集合接口一次查全表，单个键的写入使用 upsert。
 */
@Service
public class SettingsService {

    private final SceneSettingMapper sceneSettingMapper;
    private final ObjectMapper objectMapper;

    public SettingsService(SceneSettingMapper sceneSettingMapper, ObjectMapper objectMapper) {
        this.sceneSettingMapper = sceneSettingMapper;
        this.objectMapper = objectMapper;
    }

    /**
     * 返回全部设置，为旧交互数据补齐雨水偏好；同键保留后读到的值。
     */
    public Map<String, JsonNode> getAll() {
        Map<String, JsonNode> settings = new LinkedHashMap<>();
        for (SceneSettingEntity row : sceneSettingMapper.findAll()) {
            if (row.getSettingKey() != null) {
                settings.put(row.getSettingKey(), withInteractionDefaults(row.getSettingKey(), read(row.getSettingValue())));
            }
        }
        return settings;
    }

    /**
     * 读取一个键并兼容旧雨水设置；空 Optional 表示行不存在，JSON null 仍会返回。
     */
    public Optional<JsonNode> getByKey(String key) {
        SceneSettingEntity row = sceneSettingMapper.findByKey(key);
        if (row == null) {
            return Optional.empty();
        }
        return Optional.of(withInteractionDefaults(key, read(row.getSettingValue())));
    }

    /**
     * 校验并保存 JSON 设置，旧客户端缺少雨水偏好时补为开启后返回。
     */
    public JsonNode save(String key, JsonNode value) {
        if ("interaction".equals(key) && !InteractionValidator.isInteractionSettings(value)) {
            throw new InvalidInteractionException();
        }
        JsonNode normalized = withInteractionDefaults(key, value);
        sceneSettingMapper.upsert(key, write(normalized));
        return normalized;
    }

    /**
     * 仅为缺字段的交互 JSON 补充默认雨水偏好，不改写请求体或其他设置。
     */
    private JsonNode withInteractionDefaults(String key, JsonNode value) {
        if ("interaction".equals(key) && value instanceof ObjectNode object && !object.has("rainEnabled")) {
            ObjectNode normalized = object.deepCopy();
            normalized.put("rainEnabled", true);
            return normalized;
        }
        return value;
    }

    private JsonNode read(String raw) {
        if (raw == null) {
            return NullNode.getInstance();
        }
        try {
            JsonNode node = objectMapper.readTree(raw);
            return node == null ? NullNode.getInstance() : node;
        } catch (JsonProcessingException ex) {
            throw new StoredJsonException();
        }
    }

    private String write(JsonNode value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new StoredJsonException();
        }
    }
}
