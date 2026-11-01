package com.mairy.konbini.service;

import java.util.Map;
import java.util.Optional;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * 场景设置读写接口，返回前端使用的 JSON 值。
 */
public interface SettingsService {

    /**
     * 一次读取全部设置，并补齐旧交互数据的默认值。
     */
    Map<String, JsonNode> getAll();

    /**
     * 按键读取设置，空 Optional 表示该行不存在。
     */
    Optional<JsonNode> getByKey(String key);

    /**
     * 校验并保存设置，返回补齐默认值后的 JSON。
     */
    JsonNode save(String key, JsonNode value);
}
