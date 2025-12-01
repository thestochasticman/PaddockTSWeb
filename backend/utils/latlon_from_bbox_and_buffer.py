import math
from typing import Tuple

def latlon_from_bbox_and_buffer(
    bbox: list[float],
    buffer_km: float,
    tol: float = 1e-3,
) -> Tuple[float, float, bool]:
    """
    Given bbox = [lat_min, lon_min, lat_max, lon_max] and buffer_km
    (interpreted in the same way as the frontend),
    return (lat0, lon0, is_exact).

    is_exact = True  if this bbox is consistent with that buffer
              = False otherwise (center is still returned, but reconstructing
                                with buffer_km won't give exactly this bbox).
    """
    south, west, north, east = bbox

    center_lat = (north + south) / 2.0
    center_lon = (east + west) / 2.0

    # geometry implied by the bbox
    actual_d_lat = (north - south) / 2.0
    actual_d_lon = (east - west) / 2.0

    km_per_deg_lat = 111.0
    expected_d_lat = buffer_km / km_per_deg_lat

    lat_rad = math.radians(center_lat)
    km_per_deg_lon = km_per_deg_lat * max(math.cos(lat_rad), 1e-6)
    expected_d_lon = buffer_km / km_per_deg_lon

    ok_lat = abs(actual_d_lat - expected_d_lat) <= tol
    ok_lon = abs(actual_d_lon - expected_d_lon) <= tol

    is_exact = ok_lat and ok_lon
    return center_lat, center_lon, is_exact
