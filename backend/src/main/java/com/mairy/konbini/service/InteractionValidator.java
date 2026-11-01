package com.mairy.konbini.service;

import java.util.List;
import java.util.Map;
import java.util.Set;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * 交互设置与物件目录的校验规则，与 shared/interaction.ts 保持一致。
 */
public final class InteractionValidator {

    /** 可切换样式的十类物件，顺序与前端目录相同。 */
    public static final List<String> OBJECT_KEYS = List.of(
            "store", "vending", "bike", "umbrella", "bins", "lamp", "notice", "poles", "guardrail", "ac");

    private static final Set<String> OBJECT_KEY_SET = Set.copyOf(OBJECT_KEYS);

    private InteractionValidator() {
    }

    /**
     * 校验交互设置：雨水偏好允许缺省，否则必须为布尔；样式仅限已知物件的 0、1 或 2。
     */
    public static boolean isInteractionSettings(JsonNode value) {
        if (value == null || !value.isObject()) {
            return false;
        }
        JsonNode version = value.get("version");
        JsonNode exploded = value.get("exploded");
        JsonNode styles = value.get("styles");
        if (!isExactNumber(version, 1) || exploded == null || !exploded.isBoolean()) {
            return false;
        }
        JsonNode rainEnabled = value.get("rainEnabled");
        if (rainEnabled != null && !rainEnabled.isBoolean()) {
            return false;
        }
        if (!(styles instanceof ObjectNode stylesObject)) {
            return false;
        }
        for (Map.Entry<String, JsonNode> entry : stylesObject.properties()) {
            if (!OBJECT_KEY_SET.contains(entry.getKey()) || !isStyleIndex(entry.getValue())) {
                return false;
            }
        }
        return true;
    }

    /**
     * 判断目录行是否能安全交给面板：三个非空中文名，默认样式为 0、1 或 2。
     */
    public static boolean isSceneObject(String objectKey, String displayName, List<String> styleLabels,
            Integer defaultStyle, Integer sortOrder) {
        if (!OBJECT_KEY_SET.contains(objectKey) || displayName == null || displayName.isBlank()) {
            return false;
        }
        if (styleLabels == null || styleLabels.size() != 3
                || styleLabels.stream().anyMatch(label -> label == null || label.isBlank())) {
            return false;
        }
        return defaultStyle != null && defaultStyle >= 0 && defaultStyle <= 2 && sortOrder != null;
    }

    private static boolean isStyleIndex(JsonNode value) {
        return isExactNumber(value, 0) || isExactNumber(value, 1) || isExactNumber(value, 2);
    }

    private static boolean isExactNumber(JsonNode value, int expected) {
        return value != null && value.isIntegralNumber() && value.canConvertToInt() && value.intValue() == expected;
    }
}
