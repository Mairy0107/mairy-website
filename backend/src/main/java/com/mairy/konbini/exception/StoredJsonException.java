package com.mairy.konbini.exception;

/**
 * 库里的 JSON 文本无法解析。不携带原始内容，避免错误响应泄出数据。
 */
public class StoredJsonException extends RuntimeException {
}
