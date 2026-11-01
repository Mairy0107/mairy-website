package com.mairy.konbini.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.Test;

/**
 * 对照前端 shared/interaction.ts 的交互与目录规则。
 */
class InteractionValidatorTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void acceptsPartialStylesAndRejectsUnknownObjects() throws Exception {
        assertTrue(InteractionValidator.isInteractionSettings(objectMapper.readTree(
                "{\"exploded\":true,\"styles\":{\"store\":1,\"lamp\":2},\"version\":1}")));
        assertTrue(InteractionValidator.isInteractionSettings(objectMapper.readTree(
                "{\"exploded\":false,\"styles\":{},\"version\":1,\"extra\":true}")));
        assertFalse(InteractionValidator.isInteractionSettings(objectMapper.readTree(
                "{\"exploded\":false,\"styles\":{\"store\":3},\"version\":1}")));
        assertFalse(InteractionValidator.isInteractionSettings(objectMapper.readTree(
                "{\"exploded\":false,\"styles\":{\"unknown\":0},\"version\":1}")));
        assertFalse(InteractionValidator.isInteractionSettings(objectMapper.readTree(
                "{\"exploded\":1,\"styles\":{},\"version\":1}")));
        assertFalse(InteractionValidator.isInteractionSettings(objectMapper.readTree(
                "{\"exploded\":false,\"styles\":{},\"version\":\"1\"}")));
        assertFalse(InteractionValidator.isInteractionSettings(objectMapper.readTree("[]")));
    }

    /** 校验雨水布尔偏好，并允许旧客户端省略字段。 */
    @Test
    void checksRainPreferenceAndAcceptsLegacySettings() throws Exception {
        String legacy = "{\"exploded\":false,\"styles\":{},\"version\":1}";
        assertTrue(InteractionValidator.isInteractionSettings(objectMapper.readTree(legacy)));
        for (String value : List.of("true", "false", "null", "0", "\"false\"")) {
            String body = legacy.substring(0, legacy.length() - 1) + ",\"rainEnabled\":" + value + "}";
            boolean valid = InteractionValidator.isInteractionSettings(objectMapper.readTree(body));
            if ("true".equals(value) || "false".equals(value)) {
                assertTrue(valid);
            } else {
                assertFalse(valid);
            }
        }
    }

    @Test
    void checksCatalogShape() {
        assertTrue(InteractionValidator.isSceneObject(
                "lamp", "路灯", List.of("暖黄灯", "冷白灯", "霓虹紫"), 0, 5));
        assertFalse(InteractionValidator.isSceneObject(
                "lamp", "  ", List.of("暖黄灯", "冷白灯", "霓虹紫"), 0, 5));
        assertFalse(InteractionValidator.isSceneObject(
                "road", "路面", List.of("甲", "乙", "丙"), 0, 1));
        assertFalse(InteractionValidator.isSceneObject(
                "lamp", "路灯", List.of("暖黄灯", "冷白灯"), 0, 5));
    }
}
