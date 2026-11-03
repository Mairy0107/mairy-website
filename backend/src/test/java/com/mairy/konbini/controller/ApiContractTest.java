package com.mairy.konbini.controller;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mairy.konbini.config.ApiResponseFilter;
import com.mairy.konbini.config.ApiWebConfig;
import com.mairy.konbini.entity.SceneObject;
import com.mairy.konbini.entity.SceneSetting;
import com.mairy.konbini.mapper.DatabaseProbeMapper;
import com.mairy.konbini.mapper.SceneObjectMapper;
import com.mairy.konbini.mapper.SceneSettingMapper;
import com.mairy.konbini.service.impl.HealthServiceImpl;
import com.mairy.konbini.service.impl.SceneObjectServiceImpl;
import com.mairy.konbini.service.impl.SettingsServiceImpl;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataRetrievalFailureException;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * 用模拟 Mapper 核对前端依赖的状态码和 JSON 形状，不连接 MySQL。
 */
@WebMvcTest(controllers = {
        HealthController.class,
        SettingsController.class,
        ObjectsController.class
})
@Import({
        HealthServiceImpl.class,
        SettingsServiceImpl.class,
        SceneObjectServiceImpl.class,
        ApiResponseFilter.class,
        ApiWebConfig.class
})
class ApiContractTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private SceneSettingMapper settingMapper;

    @MockitoBean
    private SceneObjectMapper objectMapperDao;

    @MockitoBean
    private DatabaseProbeMapper databaseProbeMapper;

    @Test
    void healthReportsDatabaseStateWithoutConnectionDetails() throws Exception {
        when(databaseProbeMapper.ping()).thenReturn(1);
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.database").value("ok"));

        when(databaseProbeMapper.ping()).thenThrow(new DataRetrievalFailureException("password=secret host=10.0.0.1"));
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value("error"))
                .andExpect(jsonPath("$.database").value("unavailable"))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("secret"))));
    }

    /** 验证雨水关闭与原有设置一起持久化。 */
    @Test
    void settingsRoundTripPreservesJsonValues() throws Exception {
        SceneSetting camera = new SceneSetting();
        camera.setSettingKey("camera");
        camera.setSettingValue("{\"position\":[19,16,23],\"target\":[0,1.1,0]}");
        SceneSetting reveal = new SceneSetting();
        reveal.setSettingKey("reveal");
        reveal.setSettingValue("{\"enabled\":false}");
        when(settingMapper.findAll()).thenReturn(List.of(camera, reveal));

        mockMvc.perform(get("/api/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.camera.position[0]").value(19))
                .andExpect(jsonPath("$.reveal.enabled").value(false));

        when(settingMapper.findByKey("missing")).thenReturn(null);
        mockMvc.perform(get("/api/settings/missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("设置不存在"));

        String body = "{\"exploded\":true,\"rainEnabled\":false,\"styles\":{\"store\":1},\"version\":1}";
        mockMvc.perform(put("/api/settings/interaction")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exploded").value(true))
                .andExpect(jsonPath("$.styles.store").value(1))
                .andExpect(jsonPath("$.rainEnabled").value(false));
        ArgumentCaptor<String> stored = ArgumentCaptor.forClass(String.class);
        verify(settingMapper).upsert(eq("interaction"), stored.capture());
        org.junit.jupiter.api.Assertions.assertEquals(objectMapper.readTree(body), objectMapper.readTree(stored.getValue()));
    }

    /** 验证旧库读取及旧客户端保存均补齐默认开启，关闭偏好可刷新读取。 */
    @Test
    void defaultsLegacyRainPreferenceAndReadsSavedPreference() throws Exception {
        SceneSetting interaction = new SceneSetting();
        interaction.setSettingKey("interaction");
        String legacy = "{\"exploded\":false,\"styles\":{},\"version\":1}";
        interaction.setSettingValue(legacy);
        when(settingMapper.findAll()).thenReturn(List.of(interaction));
        when(settingMapper.findByKey("interaction")).thenReturn(interaction);

        mockMvc.perform(get("/api/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.interaction.rainEnabled").value(true));
        mockMvc.perform(get("/api/settings/interaction"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rainEnabled").value(true));
        mockMvc.perform(put("/api/settings/interaction")
                        .contentType(MediaType.APPLICATION_JSON).content(legacy))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rainEnabled").value(true));
        ArgumentCaptor<String> stored = ArgumentCaptor.forClass(String.class);
        verify(settingMapper).upsert(eq("interaction"), stored.capture());
        org.junit.jupiter.api.Assertions.assertTrue(objectMapper.readTree(stored.getValue()).get("rainEnabled").booleanValue());

        interaction.setSettingValue("{\"exploded\":false,\"rainEnabled\":false,\"styles\":{},\"version\":1}");
        mockMvc.perform(get("/api/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.interaction.rainEnabled").value(false));
        mockMvc.perform(get("/api/settings/interaction"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rainEnabled").value(false));
    }

    /** 四模式沿用原设置接口保存并读取，保持绽开和样式字段不变。 */
    @ParameterizedTest
    @ValueSource(strings = { "clear", "rain", "thunderstorm", "windy" })
    void savesAndReadsWeatherModes(String mode) throws Exception {
        boolean wet = "rain".equals(mode) || "thunderstorm".equals(mode);
        String body = "{\"exploded\":true,\"styles\":{\"store\":1},\"version\":1,\"weatherMode\":\""
                + mode + "\",\"rainEnabled\":" + wet + "}";
        mockMvc.perform(put("/api/settings/interaction")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.weatherMode").value(mode))
                .andExpect(jsonPath("$.rainEnabled").value(wet))
                .andExpect(jsonPath("$.exploded").value(true))
                .andExpect(jsonPath("$.styles.store").value(1));
        ArgumentCaptor<String> stored = ArgumentCaptor.forClass(String.class);
        verify(settingMapper).upsert(eq("interaction"), stored.capture());
        org.junit.jupiter.api.Assertions.assertEquals(objectMapper.readTree(body), objectMapper.readTree(stored.getValue()));

        SceneSetting interaction = new SceneSetting();
        interaction.setSettingKey("interaction");
        interaction.setSettingValue(stored.getValue());
        when(settingMapper.findAll()).thenReturn(List.of(interaction));
        mockMvc.perform(get("/api/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.interaction.weatherMode").value(mode));
    }

    /** 无效天气必须在写入前拒绝，避免保存后前端无法加载整个交互设置。 */
    @ParameterizedTest
    @ValueSource(strings = { "null", "0", "true", "\"snow\"", "\"RAIN\"", "\"\"" })
    void rejectsInvalidWeatherModes(String value) throws Exception {
        mockMvc.perform(put("/api/settings/interaction")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"exploded\":false,\"styles\":{},\"version\":1,\"weatherMode\":" + value + "}"))
                .andExpect(status().isBadRequest());
        verify(settingMapper, never()).upsert(anyString(), anyString());
    }

    /** 无效雨水字段必须在写入数据库之前被拒绝。 */
    @Test
    void rejectsInvalidRainPreference() throws Exception {
        for (String value : List.of("null", "0", "\"false\"")) {
            mockMvc.perform(put("/api/settings/interaction")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"exploded\":false,\"styles\":{},\"version\":1,\"rainEnabled\":" + value + "}"))
                    .andExpect(status().isBadRequest());
        }
        verify(settingMapper, never()).upsert(anyString(), anyString());
    }

    @Test
    void rejectsInvalidInteractionAndNonJsonWrites() throws Exception {
        mockMvc.perform(put("/api/settings/interaction")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"exploded\":false,\"styles\":{\"store\":3},\"version\":1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("交互设置格式无效，请使用 version: 1、exploded 布尔值、可选 rainEnabled 布尔值、可选 weatherMode（clear/rain/thunderstorm/windy）及 0/1/2 样式"));
        verify(settingMapper, never()).upsert(anyString(), anyString());

        mockMvc.perform(put("/api/settings/camera").content("{\"position\":[1,2,3]}"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.error").value("请使用 application/json"));

        mockMvc.perform(put("/api/settings/camera")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("请求格式无效"));

        mockMvc.perform(put("/api/settings/camera")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("请求体必须是 JSON 值"));

        mockMvc.perform(put("/api/settings/flag")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("true"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    @Test
    void limitsBodySizeAndUnknownRoutes() throws Exception {
        mockMvc.perform(put("/api/settings/camera")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new byte[ApiResponseFilter.MAX_BODY_BYTES + 1]))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.error").value("请求体过大"));

        mockMvc.perform(get("/api/unknown"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("接口不存在"));

        mockMvc.perform(post("/api/health"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("接口不存在"));
    }

    /**
     * 验证物件目录响应，并隐藏无效目录行的原始内容。
     */
    @Test
    void returnsObjectCatalogAndHidesInvalidRows() throws Exception {
        when(objectMapperDao.findAll()).thenReturn(List.of(lamp()));
        mockMvc.perform(get("/api/objects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].objectKey").value("lamp"))
                .andExpect(jsonPath("$[0].displayName").value("路灯"))
                .andExpect(jsonPath("$[0].styleLabels[2]").value("霓虹紫"))
                .andExpect(jsonPath("$[0].defaultStyle").value(0))
                .andExpect(jsonPath("$[0].sortOrder").value(5));

        SceneObject broken = lamp();
        broken.setDisplayName("SHOULD_NOT_LEAK");
        broken.setStyleLabels("[]");
        when(objectMapperDao.findAll()).thenReturn(List.of(broken));
        mockMvc.perform(get("/api/objects"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("服务暂时不可用"))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("SHOULD_NOT_LEAK"))));
    }

    /**
     * 创建目录接口测试使用的路灯数据。
     */
    private static SceneObject lamp() {
        SceneObject row = new SceneObject();
        row.setObjectKey("lamp");
        row.setDisplayName("路灯");
        row.setStyleLabels("[\"暖黄灯\",\"冷白灯\",\"霓虹紫\"]");
        row.setDefaultStyle(0);
        row.setSortOrder(5);
        return row;
    }
}
