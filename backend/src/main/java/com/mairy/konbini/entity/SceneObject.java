package com.mairy.konbini.entity;

/**
 * scene_objects 的一行。styleLabels 仍是 JSON 数组文本。
 */
public class SceneObject {

    private String objectKey;
    private String displayName;
    private String styleLabels;
    private Integer defaultStyle;
    private Integer sortOrder;

    public String getObjectKey() {
        return objectKey;
    }

    public void setObjectKey(String objectKey) {
        this.objectKey = objectKey;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getStyleLabels() {
        return styleLabels;
    }

    public void setStyleLabels(String styleLabels) {
        this.styleLabels = styleLabels;
    }

    public Integer getDefaultStyle() {
        return defaultStyle;
    }

    public void setDefaultStyle(Integer defaultStyle) {
        this.defaultStyle = defaultStyle;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }
}
