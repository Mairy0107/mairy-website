package com.mairy.konbini.controller;

import com.mairy.konbini.dto.ErrorResponse;
import com.mairy.konbini.exception.InvalidCatalogException;
import com.mairy.konbini.exception.InvalidInteractionException;
import com.mairy.konbini.exception.PayloadTooLargeException;
import com.mairy.konbini.exception.SettingNotFoundException;
import com.mairy.konbini.exception.StoredJsonException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * 把各类失败收成固定中文 JSON。日志只记异常类型，不记 SQL 或连接参数。
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(SettingNotFoundException.class)
    public ResponseEntity<ErrorResponse> missingSetting() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(ApiMessages.SETTING_MISSING));
    }

    @ExceptionHandler(InvalidInteractionException.class)
    public ResponseEntity<ErrorResponse> badInteraction() {
        return ResponseEntity.badRequest().body(new ErrorResponse(ApiMessages.BAD_INTERACTION));
    }

    @ExceptionHandler({PayloadTooLargeException.class, MaxUploadSizeExceededException.class})
    public ResponseEntity<ErrorResponse> tooLarge() {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(new ErrorResponse(ApiMessages.TOO_LARGE));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> mediaType() {
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                .body(new ErrorResponse(ApiMessages.JSON_REQUIRED));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> unreadable(HttpMessageNotReadableException exception) {
        if (causedBy(exception, PayloadTooLargeException.class)) {
            return tooLarge();
        }
        String message = String.valueOf(exception.getMessage());
        boolean empty = message.contains("Required request body is missing")
                || message.contains("No content to map");
        String text = empty ? ApiMessages.EMPTY_BODY : ApiMessages.BAD_REQUEST;
        return ResponseEntity.badRequest().body(new ErrorResponse(text));
    }

    @ExceptionHandler({
            HttpRequestMethodNotSupportedException.class,
            NoHandlerFoundException.class,
            NoResourceFoundException.class
    })
    public ResponseEntity<ErrorResponse> noRoute() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(ApiMessages.NO_ROUTE));
    }

    @ExceptionHandler({
            DataAccessException.class,
            StoredJsonException.class,
            InvalidCatalogException.class
    })
    public ResponseEntity<ErrorResponse> unavailable(RuntimeException exception) {
        log.error("接口处理失败: {}", exception.getClass().getName());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(ApiMessages.UNAVAILABLE));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> fallback(Exception exception) {
        log.error("接口处理失败: {}", exception.getClass().getName());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(ApiMessages.UNAVAILABLE));
    }

    private static boolean causedBy(Throwable exception, Class<? extends Throwable> type) {
        Throwable current = exception;
        while (current != null) {
            if (type.isInstance(current)) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}
