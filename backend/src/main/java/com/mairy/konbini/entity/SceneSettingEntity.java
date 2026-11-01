package com.mairy.konbini.entity;

/**
 * scene_settings 的一行。settingValue 是库中的 JSON 文本。
 */
public class SceneSettingEntity {

    private String settingKey;
    private String settingValue;

    public String getSettingKey() {
        return settingKey;
    }

    public void setSettingKey(String settingKey) {
        this.settingKey = settingKey;
    }

    public String getSettingValue() {
        return settingValue;
    }

    public void setSettingValue(String settingValue) {
        this.settingValue = settingValue;
    }
}
