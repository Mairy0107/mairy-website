package com.mairy.konbini.controller;

/**
 * 返回给前端的固定错误文案，不拼接异常原文。
 */
public final class ApiMessages {

    public static final String SETTING_MISSING = "设置不存在";
    public static final String JSON_REQUIRED = "请使用 application/json";
    public static final String EMPTY_BODY = "请求体必须是 JSON 值";
    public static final String BAD_REQUEST = "请求格式无效";
    public static final String TOO_LARGE = "请求体过大";
    public static final String NO_ROUTE = "接口不存在";
    public static final String UNAVAILABLE = "服务暂时不可用";
    public static final String BAD_INTERACTION = "交互设置格式无效，请使用 version: 1、exploded 布尔值、可选 rainEnabled 布尔值、可选 weatherMode（clear/rain/thunderstorm/windy）及 0/1/2 样式";

    private ApiMessages() {
    }
}
