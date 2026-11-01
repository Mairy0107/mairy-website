package com.mairy.konbini.service;

import java.util.List;

import com.mairy.konbini.dto.SceneObjectResponse;

/**
 * 场景物件目录接口，提供经过校验的展示数据。
 */
public interface SceneObjectService {

    /**
     * 按数据库排序返回目录，拒绝不完整的物件数据。
     */
    List<SceneObjectResponse> list();
}
