package com.mairy.konbini.service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.NullNode;
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
     * 返回全部设置。同一个键出现多行时保留后读到的值。
     */
    public Map<String, JsonNode> getAll() {
        Map<String, JsonNode> settings = new LinkedHashMap<>();
        for (SceneSettingEntity row : sceneSettingMapper.findAll()) {
            if (row.getSettingKey() != null) {
                settings.put(row.getSettingKey(), read(row.getSettingValue()));
            }
        }
        return settings;
    }

    /**
     * 读取一个键。空 Optional 表示行不存在，JSON null 仍会放在 Optional 里。
     */
    public Optional<JsonNode> getByKey(String key) {
        SceneSettingEntity row = sceneSettingMapper.findByKey(key);
        if (row == null) {
            return Optional.empty();
        }
        return Optional.of(read(row.getSettingValue()));
    }

    /**
     * 保存请求体中的 JSON 值并原样返回。interaction 会先按约定校验。
     */
    public JsonNode save(String key, JsonNode value) {
        if ("interaction".equals(key) && !InteractionValidator.isInteractionSettings(value)) {
            throw new InvalidInteractionException();
        }
        sceneSettingMapper.upsert(key, write(value));
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
