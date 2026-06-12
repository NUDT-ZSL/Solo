import math
import time
from typing import List, Dict, Tuple, Optional

GRID_RESOLUTION = 0.5
SAMPLE_RAYS_PER_LIGHT = 8


def point_in_polygon(px: float, py: float, polygon: List[Tuple[float, float]]) -> bool:
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def line_intersects_segment(
    x1: float, y1: float, x2: float, y2: float,
    x3: float, y3: float, x4: float, y4: float
) -> bool:
    denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if abs(denom) < 1e-10:
        return False
    t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
    u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom
    return 0 <= t <= 1 and 0 <= u <= 1


def ray_hits_any_furniture(
    lx: float, ly: float, lz: float,
    dx: float, dy: float, dz: float,
    max_dist: float,
    furniture: List[Dict]
) -> bool:
    for furn in furniture:
        polygon = furn.get('polygon', [])
        height = furn.get('height', 1.0)
        if len(polygon) < 3:
            continue

        n = len(polygon)
        for i in range(n):
            x1, y1 = polygon[i]
            x2, y2 = polygon[(i + 1) % n]

            z1 = 0.0
            z2 = 0.0
            if line_intersects_segment(lx, lz, lx + dx * max_dist, lz + dz * max_dist, x1, z1, x2, z2):
                return True

            z1 = height
            z2 = height
            if line_intersects_segment(lx, lz, lx + dx * max_dist, lz + dz * max_dist, x1, z1, x2, z2):
                return True

            if line_intersects_segment(lx, ly, lx + dx * max_dist, ly + dy * max_dist, x1, y1, x2, y2):
                return True

    return False


def calculate_illuminance_at_point(
    px: float, py: float,
    lights: List[Dict],
    furniture: List[Dict],
    natural_light: Dict
) -> float:
    total_illuminance = 0.0

    for light in lights:
        if not light.get('is_on', True):
            continue

        lx = light.get('x', 0)
        ly = light.get('y', 0)
        lz = light.get('z', 2.5)
        light_type = light.get('type', 'pendant')
        brightness = light.get('brightness', 1000)
        color_temp = light.get('color_temp', 4000)
        direction = light.get('direction', 0)
        intensity = brightness / 1000.0

        temp_factor = 1.0
        if color_temp <= 2700:
            temp_factor = 0.9
        elif color_temp >= 6500:
            temp_factor = 1.1
        else:
            temp_factor = 0.9 + (color_temp - 2700) / (6500 - 2700) * 0.2

        dx = px - lx
        dy = py - ly
        dist = math.sqrt(dx * dx + dy * dy)
        total_dist_3d = math.sqrt(dx * dx + dy * dy + lz * lz)

        if total_dist_3d < 0.1:
            total_dist_3d = 0.1

        angle_cutoff = math.pi / 3
        if light_type == 'spotlight':
            angle_cutoff = math.pi / 6
        elif light_type == 'striplight':
            angle_cutoff = math.pi / 2.5

        light_dir_rad = math.radians(direction)
        light_dx = math.sin(light_dir_rad)
        light_dy = math.cos(light_dir_rad)
        ray_dx = dx / (dist if dist > 0 else 1)
        ray_dy = dy / (dist if dist > 0 else 1)
        dot = light_dx * ray_dx + light_dy * ray_dy
        angle = math.acos(max(-1, min(1, dot)))

        if angle > angle_cutoff:
            continue

        angle_factor = math.cos(angle)
        if light_type == 'spotlight':
            angle_factor = angle_factor ** 4
        elif light_type == 'striplight':
            angle_factor = angle_factor ** 1.5
        else:
            angle_factor = angle_factor ** 2

        occlusion = 1.0
        ray_dir_x = dx / total_dist_3d
        ray_dir_y = dy / total_dist_3d
        ray_dir_z = -lz / total_dist_3d

        if ray_hits_any_furniture(lx, ly, lz, ray_dir_x, ray_dir_y, ray_dir_z, total_dist_3d, furniture):
            occlusion = 0.3

        inverse_square = 1.0 / (total_dist_3d * total_dist_3d)
        light_contribution = intensity * temp_factor * angle_factor * inverse_square * occlusion * 800
        total_illuminance += light_contribution

    sun_intensity = natural_light.get('intensity', 0)
    sun_dir = natural_light.get('direction', [0, -1, 0.5])
    sun_dx, sun_dy, sun_dz = sun_dir
    sun_len = math.sqrt(sun_dx * sun_dx + sun_dy * sun_dy + sun_dz * sun_dz)
    sun_dx /= sun_len
    sun_dy /= sun_len
    sun_dz /= sun_len

    if sun_dz > 0:
        sun_occlusion = 1.0
        if ray_hits_any_furniture(px, py, 10, -sun_dx, -sun_dy, -sun_dz, 10, furniture):
            sun_occlusion = 0.2
        total_illuminance += sun_intensity * sun_occlusion

    return total_illuminance


def calculate_illuminance_grid(
    lights: List[Dict],
    furniture: List[Dict],
    room_polygon: List[Tuple[float, float]],
    natural_light: Dict,
    grid_resolution: float = GRID_RESOLUTION
) -> List[Dict]:
    if not room_polygon:
        return []

    xs = [p[0] for p in room_polygon]
    ys = [p[1] for p in room_polygon]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)

    grid_points: List[Dict] = []

    x = min_x + grid_resolution / 2
    while x <= max_x:
        y = min_y + grid_resolution / 2
        while y <= max_y:
            if point_in_polygon(x, y, room_polygon):
                illuminance = calculate_illuminance_at_point(x, y, lights, furniture, natural_light)
                grid_points.append({
                    'x': round(x, 2),
                    'y': round(y, 2),
                    'illuminance': round(illuminance, 1)
                })
            y += grid_resolution
        x += grid_resolution

    return grid_points


def calculate_area_illuminance(
    grid_data: List[Dict],
    area_polygon: List[Tuple[float, float]]
) -> float:
    if not area_polygon or not grid_data:
        return 0.0

    points_in_area = []
    for point in grid_data:
        if point_in_polygon(point['x'], point['y'], area_polygon):
            points_in_area.append(point['illuminance'])

    if not points_in_area:
        return 0.0

    return sum(points_in_area) / len(points_in_area)


def calculate_uniformity(grid_data: List[Dict]) -> Tuple[float, str]:
    if not grid_data:
        return 0.0, "无数据"

    illuminances = [p['illuminance'] for p in grid_data]
    if not illuminances:
        return 0.0, "无数据"

    min_ill = min(illuminances)
    avg_ill = sum(illuminances) / len(illuminances)

    if avg_ill < 1e-10:
        return 0.0, "平均照度极低"

    uniformity = min_ill / avg_ill

    if uniformity >= 0.7:
        evaluation = "均匀度优秀，光线分布非常均匀"
    elif uniformity >= 0.5:
        evaluation = "均匀度较好，光线分布基本均匀"
    elif uniformity >= 0.3:
        evaluation = "均匀度一般，建议在角落补充灯具"
    else:
        evaluation = "均匀度较差，存在明显暗区，需要优化布灯方案"

    return round(uniformity, 3), evaluation
