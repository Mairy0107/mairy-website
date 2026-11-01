package com.mairy.konbini.controller;

import java.util.List;

import com.mairy.konbini.dto.SceneObjectResponse;
import com.mairy.konbini.service.SceneObjectService;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 物件目录接口。字段使用前端已经依赖的驼峰名称。
 */
@RestController
public class ObjectsController {

    private final SceneObjectService sceneObjectService;

    public ObjectsController(SceneObjectService sceneObjectService) {
        this.sceneObjectService = sceneObjectService;
    }

    /**
     * 按排序返回物件名称、三款样式和默认样式。
     */
    @GetMapping("/api/objects")
    public List<SceneObjectResponse> objects() {
        return sceneObjectService.list();
    }
}
