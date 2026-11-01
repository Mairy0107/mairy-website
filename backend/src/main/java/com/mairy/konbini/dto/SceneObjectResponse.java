package com.mairy.konbini.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

/**
 * 物件目录的一条记录。styleLabels 固定为三个中文样式名。
 */
@JsonPropertyOrder({"objectKey", "displayName", "styleLabels", "defaultStyle", "sortOrder"})
public record SceneObjectResponse(
        String objectKey,
        String displayName,
        List<String> styleLabels,
        int defaultStyle,
        int sortOrder) {
}
