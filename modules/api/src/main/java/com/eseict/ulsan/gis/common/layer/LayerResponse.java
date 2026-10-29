package com.eseict.ulsan.gis.common.layer;

public record LayerResponse(
        Long id,
        String code,
        String name,
        String color,
        Integer displayOrder
) {
    public static LayerResponse from(Layer l) {
        return new LayerResponse(l.getId(), l.getCode(), l.getName(), l.getColor(), l.getDisplayOrder());
    }
}
