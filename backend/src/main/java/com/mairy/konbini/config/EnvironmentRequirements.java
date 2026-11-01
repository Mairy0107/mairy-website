package com.mairy.konbini.config;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.EnvironmentAware;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * 启动前检查数据库变量。报错只包含变量名，不包含主机、账号或密码。
 */
@Component
public class EnvironmentRequirements implements BeanFactoryPostProcessor, EnvironmentAware {

    private Environment environment;

    /**
     * 检查调用方给出的配置值。缺哪一项就列出哪一项的名字。
     */
    public static void check(Function<String, String> lookup) {
        List<String> missing = new ArrayList<>();
        for (String name : List.of("MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE")) {
            String value = lookup.apply(name);
            if (value == null || value.isBlank()) {
                missing.add(name);
            }
        }
        if (!missing.isEmpty()) {
            throw new IllegalStateException("缺少环境变量 " + String.join(", ", missing));
        }
        checkPort(lookup.apply("PORT"), "PORT");
        checkPort(lookup.apply("MYSQL_PORT"), "MYSQL_PORT");
    }

    private static void checkPort(String value, String name) {
        if (value == null || value.isBlank()) {
            return;
        }
        try {
            int port = Integer.parseInt(value.trim());
            if (port < 1 || port > 65535) {
                throw new NumberFormatException();
            }
        } catch (NumberFormatException ex) {
            throw new IllegalStateException(name + " 端口无效");
        }
    }

    @Override
    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void postProcessBeanFactory(org.springframework.beans.factory.config.ConfigurableListableBeanFactory beanFactory) {
        check(environment::getProperty);
    }
}
