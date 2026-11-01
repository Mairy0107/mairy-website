-- 为场景相关表补充中文注释。
-- 只修改注释：列类型、是否可空、默认值和自增值都从 information_schema 原样写回。
-- 不删除行、不重建表、不覆盖业务数据。表或列不存在时跳过。
-- 请在业务库中执行，例如 test_01：
--   mysql --default-character-set=utf8mb4 -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p "$MYSQL_DATABASE" < db/migration/V1__comment_scene_tables.sql

SET NAMES utf8mb4;

SELECT IF(
    DATABASE() IS NULL,
    '请先 USE 业务库（例如 test_01）后再执行本脚本',
    CONCAT('正在为库 ', DATABASE(), ' 补充中文注释')
) AS comment_migration;

-- 表 scene_settings
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` COMMENT = ', QUOTE('场景全局设置。按键保存相机、入场动画和交互等 JSON，供页面启动时读取')
) INTO @sql
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_settings'
  AND TABLE_TYPE = 'BASE TABLE'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- 表 scene_objects
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` COMMENT = ', QUOTE('可交互物件目录。保存中文名称、三款样式名、默认样式和面板排序')
) INTO @sql
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_objects'
  AND TABLE_TYPE = 'BASE TABLE'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- 表 scene_object_prefs
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` COMMENT = ', QUOTE('按访客保存的物件样式偏好。当前接口使用全局 interaction 设置，本表只补充注释，不改动已有数据')
) INTO @sql
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_object_prefs'
  AND TABLE_TYPE = 'BASE TABLE'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- scene_settings.setting_key
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` MODIFY COLUMN `', REPLACE(COLUMN_NAME, '`', '``'), '` ',
    COLUMN_TYPE,
    IF(
        CHARACTER_SET_NAME IS NOT NULL
        AND DATA_TYPE IN ('char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'enum', 'set'),
        CONCAT(' CHARACTER SET ', CHARACTER_SET_NAME, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME))),
        ''
    ),
    IF(IS_NULLABLE = 'YES', ' NULL', ' NOT NULL'),
    CASE
        WHEN LOWER(EXTRA) LIKE '%auto_increment%' THEN ' AUTO_INCREMENT'
        WHEN COLUMN_DEFAULT IS NULL THEN ''
        WHEN LOWER(EXTRA) LIKE '%default_generated%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN UPPER(COLUMN_DEFAULT) LIKE 'CURRENT_TIMESTAMP%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'bit')
            THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        ELSE CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))
    END,
    IF(
        LOWER(EXTRA) LIKE '%on update current_timestamp%',
        CONCAT(' ON UPDATE ', TRIM(SUBSTRING(EXTRA, LOCATE('on update', LOWER(EXTRA)) + CHAR_LENGTH('on update')))),
        ''
    ),
    ' COMMENT ', QUOTE('设置键，例如 camera、reveal、interaction')
) INTO @sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_settings'
  AND COLUMN_NAME = 'setting_key'
  AND LOWER(EXTRA) NOT LIKE '%virtual generated%'
  AND LOWER(EXTRA) NOT LIKE '%stored generated%'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- scene_settings.setting_value
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` MODIFY COLUMN `', REPLACE(COLUMN_NAME, '`', '``'), '` ',
    COLUMN_TYPE,
    IF(
        CHARACTER_SET_NAME IS NOT NULL
        AND DATA_TYPE IN ('char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'enum', 'set'),
        CONCAT(' CHARACTER SET ', CHARACTER_SET_NAME, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME))),
        ''
    ),
    IF(IS_NULLABLE = 'YES', ' NULL', ' NOT NULL'),
    CASE
        WHEN LOWER(EXTRA) LIKE '%auto_increment%' THEN ' AUTO_INCREMENT'
        WHEN COLUMN_DEFAULT IS NULL THEN ''
        WHEN LOWER(EXTRA) LIKE '%default_generated%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN UPPER(COLUMN_DEFAULT) LIKE 'CURRENT_TIMESTAMP%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'bit')
            THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        ELSE CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))
    END,
    IF(
        LOWER(EXTRA) LIKE '%on update current_timestamp%',
        CONCAT(' ON UPDATE ', TRIM(SUBSTRING(EXTRA, LOCATE('on update', LOWER(EXTRA)) + CHAR_LENGTH('on update')))),
        ''
    ),
    ' COMMENT ', QUOTE('设置值，以 JSON 保存，可以是对象、数组、字符串、数字、布尔或 null')
) INTO @sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_settings'
  AND COLUMN_NAME = 'setting_value'
  AND LOWER(EXTRA) NOT LIKE '%virtual generated%'
  AND LOWER(EXTRA) NOT LIKE '%stored generated%'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- scene_settings.updated_at
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` MODIFY COLUMN `', REPLACE(COLUMN_NAME, '`', '``'), '` ',
    COLUMN_TYPE,
    IF(
        CHARACTER_SET_NAME IS NOT NULL
        AND DATA_TYPE IN ('char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'enum', 'set'),
        CONCAT(' CHARACTER SET ', CHARACTER_SET_NAME, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME))),
        ''
    ),
    IF(IS_NULLABLE = 'YES', ' NULL', ' NOT NULL'),
    CASE
        WHEN LOWER(EXTRA) LIKE '%auto_increment%' THEN ' AUTO_INCREMENT'
        WHEN COLUMN_DEFAULT IS NULL THEN ''
        WHEN LOWER(EXTRA) LIKE '%default_generated%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN UPPER(COLUMN_DEFAULT) LIKE 'CURRENT_TIMESTAMP%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'bit')
            THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        ELSE CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))
    END,
    IF(
        LOWER(EXTRA) LIKE '%on update current_timestamp%',
        CONCAT(' ON UPDATE ', TRIM(SUBSTRING(EXTRA, LOCATE('on update', LOWER(EXTRA)) + CHAR_LENGTH('on update')))),
        ''
    ),
    ' COMMENT ', QUOTE('该设置最近一次写入的时间')
) INTO @sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_settings'
  AND COLUMN_NAME = 'updated_at'
  AND LOWER(EXTRA) NOT LIKE '%virtual generated%'
  AND LOWER(EXTRA) NOT LIKE '%stored generated%'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- scene_settings.id
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` MODIFY COLUMN `', REPLACE(COLUMN_NAME, '`', '``'), '` ',
    COLUMN_TYPE,
    IF(
        CHARACTER_SET_NAME IS NOT NULL
        AND DATA_TYPE IN ('char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'enum', 'set'),
        CONCAT(' CHARACTER SET ', CHARACTER_SET_NAME, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME))),
        ''
    ),
    IF(IS_NULLABLE = 'YES', ' NULL', ' NOT NULL'),
    CASE
        WHEN LOWER(EXTRA) LIKE '%auto_increment%' THEN ' AUTO_INCREMENT'
        WHEN COLUMN_DEFAULT IS NULL THEN ''
        WHEN LOWER(EXTRA) LIKE '%default_generated%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN UPPER(COLUMN_DEFAULT) LIKE 'CURRENT_TIMESTAMP%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'bit')
            THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        ELSE CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))
    END,
    IF(
        LOWER(EXTRA) LIKE '%on update current_timestamp%',
        CONCAT(' ON UPDATE ', TRIM(SUBSTRING(EXTRA, LOCATE('on update', LOWER(EXTRA)) + CHAR_LENGTH('on update')))),
        ''
    ),
    ' COMMENT ', QUOTE('行标识。业务读取以 setting_key 为准')
) INTO @sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_settings'
  AND COLUMN_NAME = 'id'
  AND LOWER(EXTRA) NOT LIKE '%virtual generated%'
  AND LOWER(EXTRA) NOT LIKE '%stored generated%'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- scene_settings.created_at
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` MODIFY COLUMN `', REPLACE(COLUMN_NAME, '`', '``'), '` ',
    COLUMN_TYPE,
    IF(
        CHARACTER_SET_NAME IS NOT NULL
        AND DATA_TYPE IN ('char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'enum', 'set'),
        CONCAT(' CHARACTER SET ', CHARACTER_SET_NAME, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME))),
        ''
    ),
    IF(IS_NULLABLE = 'YES', ' NULL', ' NOT NULL'),
    CASE
        WHEN LOWER(EXTRA) LIKE '%auto_increment%' THEN ' AUTO_INCREMENT'
        WHEN COLUMN_DEFAULT IS NULL THEN ''
        WHEN LOWER(EXTRA) LIKE '%default_generated%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN UPPER(COLUMN_DEFAULT) LIKE 'CURRENT_TIMESTAMP%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'bit')
            THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        ELSE CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))
    END,
    IF(
        LOWER(EXTRA) LIKE '%on update current_timestamp%',
        CONCAT(' ON UPDATE ', TRIM(SUBSTRING(EXTRA, LOCATE('on update', LOWER(EXTRA)) + CHAR_LENGTH('on update')))),
        ''
    ),
    ' COMMENT ', QUOTE('记录创建时间')
) INTO @sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_settings'
  AND COLUMN_NAME = 'created_at'
  AND LOWER(EXTRA) NOT LIKE '%virtual generated%'
  AND LOWER(EXTRA) NOT LIKE '%stored generated%'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- scene_objects.object_key
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` MODIFY COLUMN `', REPLACE(COLUMN_NAME, '`', '``'), '` ',
    COLUMN_TYPE,
    IF(
        CHARACTER_SET_NAME IS NOT NULL
        AND DATA_TYPE IN ('char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'enum', 'set'),
        CONCAT(' CHARACTER SET ', CHARACTER_SET_NAME, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME))),
        ''
    ),
    IF(IS_NULLABLE = 'YES', ' NULL', ' NOT NULL'),
    CASE
        WHEN LOWER(EXTRA) LIKE '%auto_increment%' THEN ' AUTO_INCREMENT'
        WHEN COLUMN_DEFAULT IS NULL THEN ''
        WHEN LOWER(EXTRA) LIKE '%default_generated%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN UPPER(COLUMN_DEFAULT) LIKE 'CURRENT_TIMESTAMP%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'bit')
            THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        ELSE CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))
    END,
    IF(
        LOWER(EXTRA) LIKE '%on update current_timestamp%',
        CONCAT(' ON UPDATE ', TRIM(SUBSTRING(EXTRA, LOCATE('on update', LOWER(EXTRA)) + CHAR_LENGTH('on update')))),
        ''
    ),
    ' COMMENT ', QUOTE('物件键，与前端目录一致，例如 store、vending、lamp')
) INTO @sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_objects'
  AND COLUMN_NAME = 'object_key'
  AND LOWER(EXTRA) NOT LIKE '%virtual generated%'
  AND LOWER(EXTRA) NOT LIKE '%stored generated%'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- scene_objects.display_name
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` MODIFY COLUMN `', REPLACE(COLUMN_NAME, '`', '``'), '` ',
    COLUMN_TYPE,
    IF(
        CHARACTER_SET_NAME IS NOT NULL
        AND DATA_TYPE IN ('char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'enum', 'set'),
        CONCAT(' CHARACTER SET ', CHARACTER_SET_NAME, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME))),
        ''
    ),
    IF(IS_NULLABLE = 'YES', ' NULL', ' NOT NULL'),
    CASE
        WHEN LOWER(EXTRA) LIKE '%auto_increment%' THEN ' AUTO_INCREMENT'
        WHEN COLUMN_DEFAULT IS NULL THEN ''
        WHEN LOWER(EXTRA) LIKE '%default_generated%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN UPPER(COLUMN_DEFAULT) LIKE 'CURRENT_TIMESTAMP%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'bit')
            THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        ELSE CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))
    END,
    IF(
        LOWER(EXTRA) LIKE '%on update current_timestamp%',
        CONCAT(' ON UPDATE ', TRIM(SUBSTRING(EXTRA, LOCATE('on update', LOWER(EXTRA)) + CHAR_LENGTH('on update')))),
        ''
    ),
    ' COMMENT ', QUOTE('面板和悬停提示使用的中文名称')
) INTO @sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_objects'
  AND COLUMN_NAME = 'display_name'
  AND LOWER(EXTRA) NOT LIKE '%virtual generated%'
  AND LOWER(EXTRA) NOT LIKE '%stored generated%'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- scene_objects.style_labels
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` MODIFY COLUMN `', REPLACE(COLUMN_NAME, '`', '``'), '` ',
    COLUMN_TYPE,
    IF(
        CHARACTER_SET_NAME IS NOT NULL
        AND DATA_TYPE IN ('char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'enum', 'set'),
        CONCAT(' CHARACTER SET ', CHARACTER_SET_NAME, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME))),
        ''
    ),
    IF(IS_NULLABLE = 'YES', ' NULL', ' NOT NULL'),
    CASE
        WHEN LOWER(EXTRA) LIKE '%auto_increment%' THEN ' AUTO_INCREMENT'
        WHEN COLUMN_DEFAULT IS NULL THEN ''
        WHEN LOWER(EXTRA) LIKE '%default_generated%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN UPPER(COLUMN_DEFAULT) LIKE 'CURRENT_TIMESTAMP%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'bit')
            THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        ELSE CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))
    END,
    IF(
        LOWER(EXTRA) LIKE '%on update current_timestamp%',
        CONCAT(' ON UPDATE ', TRIM(SUBSTRING(EXTRA, LOCATE('on update', LOWER(EXTRA)) + CHAR_LENGTH('on update')))),
        ''
    ),
    ' COMMENT ', QUOTE('三款样式的中文名，JSON 数组，下标对应样式 0、1、2')
) INTO @sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_objects'
  AND COLUMN_NAME = 'style_labels'
  AND LOWER(EXTRA) NOT LIKE '%virtual generated%'
  AND LOWER(EXTRA) NOT LIKE '%stored generated%'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- scene_objects.default_style
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` MODIFY COLUMN `', REPLACE(COLUMN_NAME, '`', '``'), '` ',
    COLUMN_TYPE,
    IF(
        CHARACTER_SET_NAME IS NOT NULL
        AND DATA_TYPE IN ('char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'enum', 'set'),
        CONCAT(' CHARACTER SET ', CHARACTER_SET_NAME, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME))),
        ''
    ),
    IF(IS_NULLABLE = 'YES', ' NULL', ' NOT NULL'),
    CASE
        WHEN LOWER(EXTRA) LIKE '%auto_increment%' THEN ' AUTO_INCREMENT'
        WHEN COLUMN_DEFAULT IS NULL THEN ''
        WHEN LOWER(EXTRA) LIKE '%default_generated%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN UPPER(COLUMN_DEFAULT) LIKE 'CURRENT_TIMESTAMP%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'bit')
            THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        ELSE CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))
    END,
    IF(
        LOWER(EXTRA) LIKE '%on update current_timestamp%',
        CONCAT(' ON UPDATE ', TRIM(SUBSTRING(EXTRA, LOCATE('on update', LOWER(EXTRA)) + CHAR_LENGTH('on update')))),
        ''
    ),
    ' COMMENT ', QUOTE('未单独指定时使用的默认样式索引，取值为 0、1 或 2')
) INTO @sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_objects'
  AND COLUMN_NAME = 'default_style'
  AND LOWER(EXTRA) NOT LIKE '%virtual generated%'
  AND LOWER(EXTRA) NOT LIKE '%stored generated%'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- scene_objects.sort_order
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` MODIFY COLUMN `', REPLACE(COLUMN_NAME, '`', '``'), '` ',
    COLUMN_TYPE,
    IF(
        CHARACTER_SET_NAME IS NOT NULL
        AND DATA_TYPE IN ('char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'enum', 'set'),
        CONCAT(' CHARACTER SET ', CHARACTER_SET_NAME, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME))),
        ''
    ),
    IF(IS_NULLABLE = 'YES', ' NULL', ' NOT NULL'),
    CASE
        WHEN LOWER(EXTRA) LIKE '%auto_increment%' THEN ' AUTO_INCREMENT'
        WHEN COLUMN_DEFAULT IS NULL THEN ''
        WHEN LOWER(EXTRA) LIKE '%default_generated%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN UPPER(COLUMN_DEFAULT) LIKE 'CURRENT_TIMESTAMP%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'bit')
            THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        ELSE CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))
    END,
    IF(
        LOWER(EXTRA) LIKE '%on update current_timestamp%',
        CONCAT(' ON UPDATE ', TRIM(SUBSTRING(EXTRA, LOCATE('on update', LOWER(EXTRA)) + CHAR_LENGTH('on update')))),
        ''
    ),
    ' COMMENT ', QUOTE('物件在目录和面板中的排序，数值越小越靠前')
) INTO @sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_objects'
  AND COLUMN_NAME = 'sort_order'
  AND LOWER(EXTRA) NOT LIKE '%virtual generated%'
  AND LOWER(EXTRA) NOT LIKE '%stored generated%'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- scene_objects.id
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` MODIFY COLUMN `', REPLACE(COLUMN_NAME, '`', '``'), '` ',
    COLUMN_TYPE,
    IF(
        CHARACTER_SET_NAME IS NOT NULL
        AND DATA_TYPE IN ('char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'enum', 'set'),
        CONCAT(' CHARACTER SET ', CHARACTER_SET_NAME, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME))),
        ''
    ),
    IF(IS_NULLABLE = 'YES', ' NULL', ' NOT NULL'),
    CASE
        WHEN LOWER(EXTRA) LIKE '%auto_increment%' THEN ' AUTO_INCREMENT'
        WHEN COLUMN_DEFAULT IS NULL THEN ''
        WHEN LOWER(EXTRA) LIKE '%default_generated%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN UPPER(COLUMN_DEFAULT) LIKE 'CURRENT_TIMESTAMP%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'bit')
            THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        ELSE CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))
    END,
    IF(
        LOWER(EXTRA) LIKE '%on update current_timestamp%',
        CONCAT(' ON UPDATE ', TRIM(SUBSTRING(EXTRA, LOCATE('on update', LOWER(EXTRA)) + CHAR_LENGTH('on update')))),
        ''
    ),
    ' COMMENT ', QUOTE('行标识。业务读取以 object_key 为准')
) INTO @sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_objects'
  AND COLUMN_NAME = 'id'
  AND LOWER(EXTRA) NOT LIKE '%virtual generated%'
  AND LOWER(EXTRA) NOT LIKE '%stored generated%'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- scene_objects.created_at
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` MODIFY COLUMN `', REPLACE(COLUMN_NAME, '`', '``'), '` ',
    COLUMN_TYPE,
    IF(
        CHARACTER_SET_NAME IS NOT NULL
        AND DATA_TYPE IN ('char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'enum', 'set'),
        CONCAT(' CHARACTER SET ', CHARACTER_SET_NAME, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME))),
        ''
    ),
    IF(IS_NULLABLE = 'YES', ' NULL', ' NOT NULL'),
    CASE
        WHEN LOWER(EXTRA) LIKE '%auto_increment%' THEN ' AUTO_INCREMENT'
        WHEN COLUMN_DEFAULT IS NULL THEN ''
        WHEN LOWER(EXTRA) LIKE '%default_generated%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN UPPER(COLUMN_DEFAULT) LIKE 'CURRENT_TIMESTAMP%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'bit')
            THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        ELSE CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))
    END,
    IF(
        LOWER(EXTRA) LIKE '%on update current_timestamp%',
        CONCAT(' ON UPDATE ', TRIM(SUBSTRING(EXTRA, LOCATE('on update', LOWER(EXTRA)) + CHAR_LENGTH('on update')))),
        ''
    ),
    ' COMMENT ', QUOTE('记录创建时间')
) INTO @sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_objects'
  AND COLUMN_NAME = 'created_at'
  AND LOWER(EXTRA) NOT LIKE '%virtual generated%'
  AND LOWER(EXTRA) NOT LIKE '%stored generated%'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- scene_objects.updated_at
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` MODIFY COLUMN `', REPLACE(COLUMN_NAME, '`', '``'), '` ',
    COLUMN_TYPE,
    IF(
        CHARACTER_SET_NAME IS NOT NULL
        AND DATA_TYPE IN ('char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'enum', 'set'),
        CONCAT(' CHARACTER SET ', CHARACTER_SET_NAME, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME))),
        ''
    ),
    IF(IS_NULLABLE = 'YES', ' NULL', ' NOT NULL'),
    CASE
        WHEN LOWER(EXTRA) LIKE '%auto_increment%' THEN ' AUTO_INCREMENT'
        WHEN COLUMN_DEFAULT IS NULL THEN ''
        WHEN LOWER(EXTRA) LIKE '%default_generated%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN UPPER(COLUMN_DEFAULT) LIKE 'CURRENT_TIMESTAMP%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'bit')
            THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        ELSE CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))
    END,
    IF(
        LOWER(EXTRA) LIKE '%on update current_timestamp%',
        CONCAT(' ON UPDATE ', TRIM(SUBSTRING(EXTRA, LOCATE('on update', LOWER(EXTRA)) + CHAR_LENGTH('on update')))),
        ''
    ),
    ' COMMENT ', QUOTE('记录最近更新时间')
) INTO @sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_objects'
  AND COLUMN_NAME = 'updated_at'
  AND LOWER(EXTRA) NOT LIKE '%virtual generated%'
  AND LOWER(EXTRA) NOT LIKE '%stored generated%'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- scene_object_prefs.viewer_id
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` MODIFY COLUMN `', REPLACE(COLUMN_NAME, '`', '``'), '` ',
    COLUMN_TYPE,
    IF(
        CHARACTER_SET_NAME IS NOT NULL
        AND DATA_TYPE IN ('char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'enum', 'set'),
        CONCAT(' CHARACTER SET ', CHARACTER_SET_NAME, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME))),
        ''
    ),
    IF(IS_NULLABLE = 'YES', ' NULL', ' NOT NULL'),
    CASE
        WHEN LOWER(EXTRA) LIKE '%auto_increment%' THEN ' AUTO_INCREMENT'
        WHEN COLUMN_DEFAULT IS NULL THEN ''
        WHEN LOWER(EXTRA) LIKE '%default_generated%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN UPPER(COLUMN_DEFAULT) LIKE 'CURRENT_TIMESTAMP%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'bit')
            THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        ELSE CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))
    END,
    IF(
        LOWER(EXTRA) LIKE '%on update current_timestamp%',
        CONCAT(' ON UPDATE ', TRIM(SUBSTRING(EXTRA, LOCATE('on update', LOWER(EXTRA)) + CHAR_LENGTH('on update')))),
        ''
    ),
    ' COMMENT ', QUOTE('访客标识，用于按人记住物件样式')
) INTO @sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_object_prefs'
  AND COLUMN_NAME = 'viewer_id'
  AND LOWER(EXTRA) NOT LIKE '%virtual generated%'
  AND LOWER(EXTRA) NOT LIKE '%stored generated%'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- scene_object_prefs.object_key
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` MODIFY COLUMN `', REPLACE(COLUMN_NAME, '`', '``'), '` ',
    COLUMN_TYPE,
    IF(
        CHARACTER_SET_NAME IS NOT NULL
        AND DATA_TYPE IN ('char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'enum', 'set'),
        CONCAT(' CHARACTER SET ', CHARACTER_SET_NAME, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME))),
        ''
    ),
    IF(IS_NULLABLE = 'YES', ' NULL', ' NOT NULL'),
    CASE
        WHEN LOWER(EXTRA) LIKE '%auto_increment%' THEN ' AUTO_INCREMENT'
        WHEN COLUMN_DEFAULT IS NULL THEN ''
        WHEN LOWER(EXTRA) LIKE '%default_generated%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN UPPER(COLUMN_DEFAULT) LIKE 'CURRENT_TIMESTAMP%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'bit')
            THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        ELSE CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))
    END,
    IF(
        LOWER(EXTRA) LIKE '%on update current_timestamp%',
        CONCAT(' ON UPDATE ', TRIM(SUBSTRING(EXTRA, LOCATE('on update', LOWER(EXTRA)) + CHAR_LENGTH('on update')))),
        ''
    ),
    ' COMMENT ', QUOTE('物件键，对应 scene_objects.object_key')
) INTO @sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_object_prefs'
  AND COLUMN_NAME = 'object_key'
  AND LOWER(EXTRA) NOT LIKE '%virtual generated%'
  AND LOWER(EXTRA) NOT LIKE '%stored generated%'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- scene_object_prefs.style_index
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` MODIFY COLUMN `', REPLACE(COLUMN_NAME, '`', '``'), '` ',
    COLUMN_TYPE,
    IF(
        CHARACTER_SET_NAME IS NOT NULL
        AND DATA_TYPE IN ('char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'enum', 'set'),
        CONCAT(' CHARACTER SET ', CHARACTER_SET_NAME, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME))),
        ''
    ),
    IF(IS_NULLABLE = 'YES', ' NULL', ' NOT NULL'),
    CASE
        WHEN LOWER(EXTRA) LIKE '%auto_increment%' THEN ' AUTO_INCREMENT'
        WHEN COLUMN_DEFAULT IS NULL THEN ''
        WHEN LOWER(EXTRA) LIKE '%default_generated%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN UPPER(COLUMN_DEFAULT) LIKE 'CURRENT_TIMESTAMP%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'bit')
            THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        ELSE CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))
    END,
    IF(
        LOWER(EXTRA) LIKE '%on update current_timestamp%',
        CONCAT(' ON UPDATE ', TRIM(SUBSTRING(EXTRA, LOCATE('on update', LOWER(EXTRA)) + CHAR_LENGTH('on update')))),
        ''
    ),
    ' COMMENT ', QUOTE('该访客为物件选择的样式索引，取值为 0、1 或 2')
) INTO @sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_object_prefs'
  AND COLUMN_NAME = 'style_index'
  AND LOWER(EXTRA) NOT LIKE '%virtual generated%'
  AND LOWER(EXTRA) NOT LIKE '%stored generated%'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- scene_object_prefs.id
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` MODIFY COLUMN `', REPLACE(COLUMN_NAME, '`', '``'), '` ',
    COLUMN_TYPE,
    IF(
        CHARACTER_SET_NAME IS NOT NULL
        AND DATA_TYPE IN ('char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'enum', 'set'),
        CONCAT(' CHARACTER SET ', CHARACTER_SET_NAME, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME))),
        ''
    ),
    IF(IS_NULLABLE = 'YES', ' NULL', ' NOT NULL'),
    CASE
        WHEN LOWER(EXTRA) LIKE '%auto_increment%' THEN ' AUTO_INCREMENT'
        WHEN COLUMN_DEFAULT IS NULL THEN ''
        WHEN LOWER(EXTRA) LIKE '%default_generated%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN UPPER(COLUMN_DEFAULT) LIKE 'CURRENT_TIMESTAMP%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'bit')
            THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        ELSE CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))
    END,
    IF(
        LOWER(EXTRA) LIKE '%on update current_timestamp%',
        CONCAT(' ON UPDATE ', TRIM(SUBSTRING(EXTRA, LOCATE('on update', LOWER(EXTRA)) + CHAR_LENGTH('on update')))),
        ''
    ),
    ' COMMENT ', QUOTE('行标识')
) INTO @sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_object_prefs'
  AND COLUMN_NAME = 'id'
  AND LOWER(EXTRA) NOT LIKE '%virtual generated%'
  AND LOWER(EXTRA) NOT LIKE '%stored generated%'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- scene_object_prefs.created_at
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` MODIFY COLUMN `', REPLACE(COLUMN_NAME, '`', '``'), '` ',
    COLUMN_TYPE,
    IF(
        CHARACTER_SET_NAME IS NOT NULL
        AND DATA_TYPE IN ('char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'enum', 'set'),
        CONCAT(' CHARACTER SET ', CHARACTER_SET_NAME, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME))),
        ''
    ),
    IF(IS_NULLABLE = 'YES', ' NULL', ' NOT NULL'),
    CASE
        WHEN LOWER(EXTRA) LIKE '%auto_increment%' THEN ' AUTO_INCREMENT'
        WHEN COLUMN_DEFAULT IS NULL THEN ''
        WHEN LOWER(EXTRA) LIKE '%default_generated%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN UPPER(COLUMN_DEFAULT) LIKE 'CURRENT_TIMESTAMP%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'bit')
            THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        ELSE CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))
    END,
    IF(
        LOWER(EXTRA) LIKE '%on update current_timestamp%',
        CONCAT(' ON UPDATE ', TRIM(SUBSTRING(EXTRA, LOCATE('on update', LOWER(EXTRA)) + CHAR_LENGTH('on update')))),
        ''
    ),
    ' COMMENT ', QUOTE('记录创建时间')
) INTO @sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_object_prefs'
  AND COLUMN_NAME = 'created_at'
  AND LOWER(EXTRA) NOT LIKE '%virtual generated%'
  AND LOWER(EXTRA) NOT LIKE '%stored generated%'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- scene_object_prefs.updated_at
SET @sql := NULL;
SELECT CONCAT(
    'ALTER TABLE `', REPLACE(TABLE_SCHEMA, '`', '``'), '`.`', REPLACE(TABLE_NAME, '`', '``'),
    '` MODIFY COLUMN `', REPLACE(COLUMN_NAME, '`', '``'), '` ',
    COLUMN_TYPE,
    IF(
        CHARACTER_SET_NAME IS NOT NULL
        AND DATA_TYPE IN ('char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'enum', 'set'),
        CONCAT(' CHARACTER SET ', CHARACTER_SET_NAME, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME))),
        ''
    ),
    IF(IS_NULLABLE = 'YES', ' NULL', ' NOT NULL'),
    CASE
        WHEN LOWER(EXTRA) LIKE '%auto_increment%' THEN ' AUTO_INCREMENT'
        WHEN COLUMN_DEFAULT IS NULL THEN ''
        WHEN LOWER(EXTRA) LIKE '%default_generated%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN UPPER(COLUMN_DEFAULT) LIKE 'CURRENT_TIMESTAMP%' THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        WHEN DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'bit')
            THEN CONCAT(' DEFAULT ', COLUMN_DEFAULT)
        ELSE CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))
    END,
    IF(
        LOWER(EXTRA) LIKE '%on update current_timestamp%',
        CONCAT(' ON UPDATE ', TRIM(SUBSTRING(EXTRA, LOCATE('on update', LOWER(EXTRA)) + CHAR_LENGTH('on update')))),
        ''
    ),
    ' COMMENT ', QUOTE('记录最近更新时间')
) INTO @sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'scene_object_prefs'
  AND COLUMN_NAME = 'updated_at'
  AND LOWER(EXTRA) NOT LIKE '%virtual generated%'
  AND LOWER(EXTRA) NOT LIKE '%stored generated%'
LIMIT 1;
SET @sql := IFNULL(@sql, 'DO 0');
PREPARE konbini_stmt FROM @sql;
EXECUTE konbini_stmt;
DEALLOCATE PREPARE konbini_stmt;

-- 执行后可直接核对注释。缺少的表或列不会出现在结果中。
SELECT TABLE_NAME, TABLE_COMMENT
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('scene_settings', 'scene_objects', 'scene_object_prefs')
ORDER BY TABLE_NAME;

SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('scene_settings', 'scene_objects', 'scene_object_prefs')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
