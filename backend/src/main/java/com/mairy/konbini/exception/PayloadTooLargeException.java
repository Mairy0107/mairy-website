package com.mairy.konbini.exception;

import java.io.IOException;

/**
 * 请求体超过 64 KB。用受检异常从输入流抛出，便于和普通 IO 失败区分。
 */
public class PayloadTooLargeException extends IOException {
}
