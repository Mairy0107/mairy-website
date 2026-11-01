package com.mairy.konbini.mapper;

import java.nio.charset.StandardCharsets;
import java.sql.Blob;
import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import org.apache.ibatis.type.BaseTypeHandler;
import org.apache.ibatis.type.JdbcType;

/**
 * 把 MySQL JSON 列读成文本。驱动可能返回字符串、字节或 Blob，这里统一转换。
 */
public class JsonColumnTypeHandler extends BaseTypeHandler<String> {

    @Override
    public void setNonNullParameter(PreparedStatement statement, int index, String parameter, JdbcType jdbcType)
            throws SQLException {
        statement.setString(index, parameter);
    }

    @Override
    public String getNullableResult(ResultSet resultSet, String columnName) throws SQLException {
        return asText(resultSet.getObject(columnName));
    }

    @Override
    public String getNullableResult(ResultSet resultSet, int columnIndex) throws SQLException {
        return asText(resultSet.getObject(columnIndex));
    }

    @Override
    public String getNullableResult(CallableStatement statement, int columnIndex) throws SQLException {
        return asText(statement.getObject(columnIndex));
    }

    private static String asText(Object value) throws SQLException {
        if (value == null) {
            return null;
        }
        if (value instanceof String text) {
            return text;
        }
        if (value instanceof byte[] bytes) {
            return new String(bytes, StandardCharsets.UTF_8);
        }
        if (value instanceof Blob blob) {
            byte[] bytes = blob.getBytes(1, (int) blob.length());
            blob.free();
            return new String(bytes, StandardCharsets.UTF_8);
        }
        return value.toString();
    }
}
