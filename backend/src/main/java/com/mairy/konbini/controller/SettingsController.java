package com.mairy.konbini.controller;

import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.mairy.konbini.exception.SettingNotFoundException;
import com.mairy.konbini.service.SettingsService;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 场景设置接口。单个键直接返回 JSON 值本身，而不是再包一层字段。
 */
@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    /**
     * 一次返回全部设置组成的对象。
     */
    @GetMapping
    public Map<String, JsonNode> all() {
        return settingsService.getAll();
    }

    /**
     * 返回一个键的 JSON 值。键不存在时为 404。
     */
    @GetMapping("/{key}")
    public JsonNode one(@PathVariable String key) {
        return settingsService.getByKey(key).orElseThrow(SettingNotFoundException::new);
    }

    /**
     * 用请求体覆盖该键，并返回刚刚保存的值。请求体可以是对象、数组或标量。
     */
    @PutMapping(value = "/{key}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public JsonNode put(@PathVariable String key, @RequestBody JsonNode body) {
        return settingsService.save(key, body);
    }
}
