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
import com.mairy.konbini.entity.SceneObjectEntity;
import com.mairy.konbini.entity.SceneSettingEntity;
import com.mairy.konbini.repository.DatabaseProbeMapper;
import com.mairy.konbini.repository.SceneObjectMapper;
import com.mairy.konbini.repository.SceneSettingMapper;
import com.mairy.konbini.service.HealthService;
import com.mairy.konbini.service.SceneObjectService;
import com.mairy.konbini.service.SettingsService;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataRetrievalFailureException;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * 用模拟仓储核对前端依赖的状态码和 JSON 形状，不连接 MySQL。
 */
@WebMvcTest(controllers = {
        HealthController.class,
        SettingsController.class,
        ObjectsController.class
})
@Import({
        HealthService.class,
        SettingsService.class,
        SceneObjectService.class,
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

    @Test
    void settingsRoundTripPreservesJsonValues() throws Exception {
        SceneSettingEntity camera = new SceneSettingEntity();
        camera.setSettingKey("camera");
        camera.setSettingValue("{\"position\":[19,16,23],\"target\":[0,1.1,0]}");
        SceneSettingEntity reveal = new SceneSettingEntity();
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

        String body = "{\"exploded\":true,\"styles\":{\"store\":1},\"version\":1}";
        mockMvc.perform(put("/api/settings/interaction")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exploded").value(true))
                .andExpect(jsonPath("$.styles.store").value(1));
        ArgumentCaptor<String> stored = ArgumentCaptor.forClass(String.class);
        verify(settingMapper).upsert(eq("interaction"), stored.capture());
        org.junit.jupiter.api.Assertions.assertEquals(objectMapper.readTree(body), objectMapper.readTree(stored.getValue()));
    }

    @Test
    void rejectsInvalidInteractionAndNonJsonWrites() throws Exception {
        mockMvc.perform(put("/api/settings/interaction")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"exploded\":false,\"styles\":{\"store\":3},\"version\":1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("交互设置格式无效，请使用 version: 1、exploded 布尔值及 0/1/2 样式"));
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

        SceneObjectEntity broken = lamp();
        broken.setDisplayName("SHOULD_NOT_LEAK");
        broken.setStyleLabels("[]");
        when(objectMapperDao.findAll()).thenReturn(List.of(broken));
        mockMvc.perform(get("/api/objects"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("服务暂时不可用"))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("SHOULD_NOT_LEAK"))));
    }

    private static SceneObjectEntity lamp() {
        SceneObjectEntity row = new SceneObjectEntity();
        row.setObjectKey("lamp");
        row.setDisplayName("路灯");
        row.setStyleLabels("[\"暖黄灯\",\"冷白灯\",\"霓虹紫\"]");
        row.setDefaultStyle(0);
        row.setSortOrder(5);
        return row;
    }
}
