package com.mairy.konbini.repository;

import java.util.List;

import com.mairy.konbini.entity.SceneObjectEntity;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Result;
import org.apache.ibatis.annotations.Results;
import org.apache.ibatis.annotations.Select;

/**
 * scene_objects 的目录查询。排序与面板展示顺序一致。
 */
@Mapper
public interface SceneObjectMapper {

    /**
     * 按排序和物件键读取目录，不在循环中访问数据库。
     */
    @Results({
            @Result(column = "object_key", property = "objectKey"),
            @Result(column = "display_name", property = "displayName"),
            @Result(column = "style_labels", property = "styleLabels", typeHandler = JsonColumnTypeHandler.class),
            @Result(column = "default_style", property = "defaultStyle"),
            @Result(column = "sort_order", property = "sortOrder")
    })
    @Select("""
            SELECT object_key, display_name, style_labels, default_style, sort_order
            FROM scene_objects
            ORDER BY sort_order, object_key
            """)
    List<SceneObjectEntity> findAll();
}
