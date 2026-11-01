package com.mairy.konbini.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

/**
 * 数据库连通性探测。健康接口只关心能否执行这条语句。
 */
@Mapper
public interface DatabaseProbeMapper {

    /**
     * 执行最小查询。返回值由服务层判断是否为 1。
     */
    @Select("SELECT 1")
    Object ping();
}
