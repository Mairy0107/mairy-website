package com.mairy.konbini.db;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

/**
 * 确认注释脚本不会删除数据，并且覆盖三张场景表。
 */
class CommentMigrationScriptTest {

    @Test
    void onlyAdjustsComments() throws Exception {
        Path script = Path.of("..", "db", "migration", "V1__comment_scene_tables.sql");
        String sql = Files.readString(script).toLowerCase();
        assertTrue(sql.contains("scene_settings"));
        assertTrue(sql.contains("scene_objects"));
        assertTrue(sql.contains("scene_object_prefs"));
        assertTrue(sql.contains("comment"));
        assertTrue(sql.contains("information_schema"));
        assertFalse(sql.contains("drop table"));
        assertFalse(sql.contains("drop database"));
        assertFalse(sql.contains("truncate"));
        assertFalse(sql.contains("delete from"));
        assertFalse(sql.contains("insert into"));
    }
}
