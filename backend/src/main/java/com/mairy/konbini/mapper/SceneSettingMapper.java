package com.mairy.konbini.mapper;

import java.util.List;

import com.mairy.konbini.entity.SceneSetting;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Result;
import org.apache.ibatis.annotations.Results;
import org.apache.ibatis.annotations.Select;

/**
 * scene_settings 的读写。写入是单条 upsert，并刷新 updated_at。
 */
@Mapper
public interface SceneSettingMapper {

    /**
     * 一次读出全部设置，避免按键循环访问数据库。
     */
    @Results(id = "setting", value = {
            @Result(column = "setting_key", property = "settingKey"),
            @Result(column = "setting_value", property = "settingValue", typeHandler = JsonColumnTypeHandler.class)
    })
    @Select("SELECT setting_key, setting_value FROM scene_settings")
    List<SceneSetting> findAll();

    /**
     * 按主键读取一条设置。没有行时返回 null，用来和 JSON null 区分。
     */
    @Results({
            @Result(column = "setting_key", property = "settingKey"),
            @Result(column = "setting_value", property = "settingValue", typeHandler = JsonColumnTypeHandler.class)
    })
    @Select("SELECT setting_key, setting_value FROM scene_settings WHERE setting_key = #{key}")
    SceneSetting findByKey(@Param("key") String key);

    /**
     * 新增或覆盖一个 JSON 值，同时更新修改时间。
     */
    @Insert("""
            INSERT INTO scene_settings (setting_key, setting_value)
            VALUES (#{key}, CAST(#{value} AS JSON))
            ON DUPLICATE KEY UPDATE setting_value = CAST(#{value} AS JSON), updated_at = CURRENT_TIMESTAMP
            """)
    int upsert(@Param("key") String key, @Param("value") String value);
}
