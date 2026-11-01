package com.mairy.konbini.service.impl;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mairy.konbini.dto.SceneObjectResponse;
import com.mairy.konbini.entity.SceneObject;
import com.mairy.konbini.exception.InvalidCatalogException;
import com.mairy.konbini.exception.StoredJsonException;
import com.mairy.konbini.mapper.SceneObjectMapper;
import com.mairy.konbini.service.InteractionValidator;
import com.mairy.konbini.service.SceneObjectService;

import org.springframework.stereotype.Service;

/**
 * 把物件目录转换成前端使用的驼峰字段，并拒绝不完整的样式数据。
 */
@Service
public class SceneObjectServiceImpl implements SceneObjectService {

    private final SceneObjectMapper sceneObjectMapper;
    private final ObjectMapper objectMapper;

    /**
     * 注入业务处理所需的依赖。
     */
    public SceneObjectServiceImpl(SceneObjectMapper sceneObjectMapper, ObjectMapper objectMapper) {
        this.sceneObjectMapper = sceneObjectMapper;
        this.objectMapper = objectMapper;
    }

    /**
     * 按数据库排序返回目录。任一字段不合法时整次请求失败，避免面板拿到半份数据。
     */
    @Override
    public List<SceneObjectResponse> list() {
        List<SceneObjectResponse> objects = new ArrayList<>();
        for (SceneObject row : sceneObjectMapper.findAll()) {
            List<String> labels = readLabels(row.getStyleLabels());
            if (!InteractionValidator.isSceneObject(
                    row.getObjectKey(), row.getDisplayName(), labels, row.getDefaultStyle(), row.getSortOrder())) {
                throw new InvalidCatalogException();
            }
            objects.add(new SceneObjectResponse(
                    row.getObjectKey(),
                    row.getDisplayName(),
                    labels,
                    row.getDefaultStyle(),
                    row.getSortOrder()));
        }
        return objects;
    }

    /**
     * 解析样式标签数组，拒绝缺失或非字符串的标签。
     */
    private List<String> readLabels(String raw) {
        if (raw == null) {
            throw new InvalidCatalogException();
        }
        try {
            JsonNode node = objectMapper.readTree(raw);
            if (node == null || !node.isArray()) {
                throw new InvalidCatalogException();
            }
            List<String> labels = new ArrayList<>();
            for (JsonNode item : node) {
                if (!item.isTextual()) {
                    throw new InvalidCatalogException();
                }
                labels.add(item.asText());
            }
            return labels;
        } catch (JsonProcessingException ex) {
            throw new StoredJsonException();
        }
    }
}
