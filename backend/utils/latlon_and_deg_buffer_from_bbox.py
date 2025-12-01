def latlon_and_def_buffer_deg_from_bbox(
    bbox: list[float],
) -> tuple[float, float, float, float]:
    """
    Given bbox = [lat_min, lon_min, lat_max, lon_max],
    return (center_lat, center_lon, buffer_lat_deg, buffer_lon_deg).

    buffer_lat_deg = (lat_max - lat_min) / 2
    buffer_lon_deg = (lon_max - lon_min) / 2
    """
    south, west, north, east = bbox

    center_lat = (north + south) / 2.0
    center_lon = (east + west) / 2.0

    buffer_lat_deg = (north - south) / 2.0
    buffer_lon_deg = (east - west) / 2.0

    return center_lat, center_lon, max(buffer_lat_deg, buffer_lon_deg)