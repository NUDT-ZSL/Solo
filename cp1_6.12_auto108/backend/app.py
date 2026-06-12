from flask import Flask, request, jsonify
from flask_cors import CORS
import lighting_engine

app = Flask(__name__)
CORS(app)

LAYOUTS = {
    'studio_30': {
        'id': 'studio_30',
        'name': '一居室 30㎡',
        'width': 6,
        'depth': 5,
        'height': 2.8,
        'room_polygon': [
            [0, 0], [6, 0], [6, 5], [0, 5]
        ],
        'windows': [
            {'x': 5, 'y': 0, 'width': 2, 'height': 1.5, 'z': 1}
        ],
        'furniture': [
            {
                'id': 'bed_1',
                'type': 'bed',
                'name': '床',
                'x': 1,
                'y': 3,
                'width': 1.8,
                'depth': 2,
                'height': 0.5,
                'color': '#8B4513',
                'polygon': [[1, 3], [2.8, 3], [2.8, 5], [1, 5]],
                'area_polygon': [[0.5, 2.5], [3.3, 2.5], [3.3, 5.5], [0.5, 5.5]]
            },
            {
                'id': 'sofa_1',
                'type': 'sofa',
                'name': '沙发',
                'x': 4,
                'y': 1,
                'width': 1.8,
                'depth': 1,
                'height': 0.8,
                'color': '#4A4A6A',
                'polygon': [[4, 1], [5.8, 1], [5.8, 2], [4, 2]],
                'area_polygon': [[3.5, 0.5], [6.3, 0.5], [6.3, 2.5], [3.5, 2.5]]
            },
            {
                'id': 'wardrobe_1',
                'type': 'wardrobe',
                'name': '衣柜',
                'x': 0,
                'y': 0.5,
                'width': 0.6,
                'depth': 1.8,
                'height': 2.4,
                'color': '#654321',
                'polygon': [[0, 0.5], [0.6, 0.5], [0.6, 2.3], [0, 2.3]],
                'area_polygon': []
            }
        ],
        'areas': [
            {'name': '床区', 'polygon': [[0.5, 2.5], [3.3, 2.5], [3.3, 5.5], [0.5, 5.5]], 'recommended': 50},
            {'name': '沙发区', 'polygon': [[3.5, 0.5], [6.3, 0.5], [6.3, 2.5], [3.5, 2.5]], 'recommended': 300},
            {'name': '走廊', 'polygon': [[2.8, 2], [4, 2], [4, 3], [2.8, 3]], 'recommended': 100}
        ],
        'default_lights': [
            {
                'id': 'default_pendant',
                'type': 'pendant',
                'name': '主吊灯',
                'x': 3,
                'y': 2.5,
                'z': 2.5,
                'direction': 0,
                'brightness': 800,
                'color_temp': 4000,
                'is_on': True
            }
        ]
    },
    'living_40': {
        'id': 'living_40',
        'name': '客厅 40㎡',
        'width': 8,
        'depth': 5,
        'height': 2.8,
        'room_polygon': [
            [0, 0], [8, 0], [8, 5], [0, 5]
        ],
        'windows': [
            {'x': 7, 'y': 0, 'width': 3, 'height': 1.8, 'z': 1}
        ],
        'furniture': [
            {
                'id': 'sofa_l',
                'type': 'sofa',
                'name': 'L型沙发',
                'x': 1,
                'y': 2.5,
                'width': 3,
                'depth': 1.8,
                'height': 0.8,
                'color': '#3A3A5A',
                'polygon': [[1, 2.5], [4, 2.5], [4, 4.3], [3, 4.3], [3, 3.3], [1, 3.3]],
                'area_polygon': [[0.5, 2], [4.5, 2], [4.5, 4.8], [0.5, 4.8]]
            },
            {
                'id': 'table_1',
                'type': 'table',
                'name': '餐桌',
                'x': 5.5,
                'y': 1,
                'width': 1.6,
                'depth': 1,
                'height': 0.75,
                'color': '#8B7355',
                'polygon': [[5.5, 1], [7.1, 1], [7.1, 2], [5.5, 2]],
                'area_polygon': [[5, 0.5], [7.6, 0.5], [7.6, 2.5], [5, 2.5]]
            },
            {
                'id': 'tv_stand',
                'type': 'tv_stand',
                'name': '电视柜',
                'x': 1,
                'y': 0.5,
                'width': 2.4,
                'depth': 0.45,
                'height': 0.5,
                'color': '#2A2A3E',
                'polygon': [[1, 0.5], [3.4, 0.5], [3.4, 0.95], [1, 0.95]],
                'area_polygon': []
            },
            {
                'id': 'bookshelf',
                'type': 'bookshelf',
                'name': '书架',
                'x': 0,
                'y': 3.5,
                'width': 0.5,
                'depth': 1.2,
                'height': 2.2,
                'color': '#5C4033',
                'polygon': [[0, 3.5], [0.5, 3.5], [0.5, 4.7], [0, 4.7]],
                'area_polygon': []
            }
        ],
        'areas': [
            {'name': '沙发区', 'polygon': [[0.5, 2], [4.5, 2], [4.5, 4.8], [0.5, 4.8]], 'recommended': 300},
            {'name': '用餐区', 'polygon': [[5, 0.5], [7.6, 0.5], [7.6, 2.5], [5, 2.5]], 'recommended': 150},
            {'name': '走廊', 'polygon': [[3.4, 0.95], [5.5, 0.95], [5.5, 2], [3.4, 2]], 'recommended': 100}
        ],
        'default_lights': [
            {
                'id': 'pendant_main',
                'type': 'pendant',
                'name': '客厅主灯',
                'x': 3.5,
                'y': 2.5,
                'z': 2.5,
                'direction': 0,
                'brightness': 1000,
                'color_temp': 4000,
                'is_on': True
            },
            {
                'id': 'pendant_dining',
                'type': 'pendant',
                'name': '餐厅吊灯',
                'x': 6.3,
                'y': 1.5,
                'z': 2.2,
                'direction': 0,
                'brightness': 600,
                'color_temp': 3000,
                'is_on': True
            }
        ]
    },
    'loft_50': {
        'id': 'loft_50',
        'name': '开放式Loft 50㎡',
        'width': 10,
        'depth': 5,
        'height': 3.5,
        'room_polygon': [
            [0, 0], [10, 0], [10, 5], [0, 5]
        ],
        'windows': [
            {'x': 9, 'y': 0, 'width': 4, 'height': 2.2, 'z': 1.2},
            {'x': 9, 'y': 2.8, 'width': 4, 'height': 2.2, 'z': 1.2}
        ],
        'furniture': [
            {
                'id': 'sofa_modern',
                'type': 'sofa',
                'name': '现代沙发',
                'x': 2,
                'y': 1,
                'width': 2.5,
                'depth': 1,
                'height': 0.85,
                'color': '#2D4A6E',
                'polygon': [[2, 1], [4.5, 1], [4.5, 2], [2, 2]],
                'area_polygon': [[1.5, 0.5], [5, 0.5], [5, 2.5], [1.5, 2.5]]
            },
            {
                'id': 'island_kitchen',
                'type': 'table',
                'name': '中岛台',
                'x': 6,
                'y': 0.8,
                'width': 2,
                'depth': 1.2,
                'height': 0.9,
                'color': '#D3D3D3',
                'polygon': [[6, 0.8], [8, 0.8], [8, 2], [6, 2]],
                'area_polygon': [[5.5, 0.3], [8.5, 0.3], [8.5, 2.5], [5.5, 2.5]]
            },
            {
                'id': 'bed_loft',
                'type': 'bed',
                'name': '高架床',
                'x': 1,
                'y': 3.5,
                'width': 2,
                'depth': 1.5,
                'height': 0.6,
                'color': '#4A4A6A',
                'polygon': [[1, 3.5], [3, 3.5], [3, 5], [1, 5]],
                'area_polygon': [[0.5, 3], [3.5, 3], [3.5, 5.5], [0.5, 5.5]]
            },
            {
                'id': 'desk_1',
                'type': 'table',
                'name': '书桌',
                'x': 4.5,
                'y': 3.2,
                'width': 1.4,
                'depth': 0.7,
                'height': 0.75,
                'color': '#654321',
                'polygon': [[4.5, 3.2], [5.9, 3.2], [5.9, 3.9], [4.5, 3.9]],
                'area_polygon': [[4, 2.7], [6.4, 2.7], [6.4, 4.4], [4, 4.4]]
            },
            {
                'id': 'partition',
                'type': 'partition',
                'name': '隔断',
                'x': 3.8,
                'y': 2.5,
                'width': 0.3,
                'depth': 2,
                'height': 2.5,
                'color': '#8B8B8B',
                'polygon': [[3.8, 2.5], [4.1, 2.5], [4.1, 4.5], [3.8, 4.5]],
                'area_polygon': []
            },
            {
                'id': 'couch',
                'type': 'sofa',
                'name': '休闲躺椅',
                'x': 7.5,
                'y': 3.5,
                'width': 1.2,
                'depth': 1.2,
                'height': 0.7,
                'color': '#6B4423',
                'polygon': [[7.5, 3.5], [8.7, 3.5], [8.7, 4.7], [7.5, 4.7]],
                'area_polygon': [[7, 3], [9.2, 3], [9.2, 5.2], [7, 5.2]]
            }
        ],
        'areas': [
            {'name': '沙发区', 'polygon': [[1.5, 0.5], [5, 0.5], [5, 2.5], [1.5, 2.5]], 'recommended': 300},
            {'name': '用餐区', 'polygon': [[5.5, 0.3], [8.5, 0.3], [8.5, 2.5], [5.5, 2.5]], 'recommended': 150},
            {'name': '床区', 'polygon': [[0.5, 3], [3.5, 3], [3.5, 5.5], [0.5, 5.5]], 'recommended': 50},
            {'name': '阅读区', 'polygon': [[4, 2.7], [6.4, 2.7], [6.4, 4.4], [4, 4.4]], 'recommended': 300}
        ],
        'default_lights': [
            {
                'id': 'track_light_1',
                'type': 'spotlight',
                'name': '轨道射灯1',
                'x': 3,
                'y': 2.5,
                'z': 3.2,
                'direction': 180,
                'brightness': 500,
                'color_temp': 4000,
                'is_on': True
            },
            {
                'id': 'track_light_2',
                'type': 'spotlight',
                'name': '轨道射灯2',
                'x': 5,
                'y': 2.5,
                'z': 3.2,
                'direction': 0,
                'brightness': 500,
                'color_temp': 4000,
                'is_on': True
            },
            {
                'id': 'pendant_kitchen',
                'type': 'pendant',
                'name': '中岛吊灯',
                'x': 7,
                'y': 1.4,
                'z': 2.8,
                'direction': 0,
                'brightness': 800,
                'color_temp': 3500,
                'is_on': True
            }
        ]
    }
}

NATURAL_LIGHT_PRESETS = {
    'morning_9': {
        'time_name': '上午9点',
        'ambient_color': '#FFF8E7',
        'background_color': '#87CEEB',
        'sun_intensity': 600,
        'sun_direction': [0.5, -0.8, 0.3],
        'ambient_intensity': 0.4
    },
    'afternoon_3': {
        'time_name': '下午3点',
        'ambient_color': '#FFFFFF',
        'background_color': '#B0E0E6',
        'sun_intensity': 1200,
        'sun_direction': [-0.3, -0.9, 0.2],
        'ambient_intensity': 0.6
    },
    'night_8': {
        'time_name': '晚上8点',
        'ambient_color': '#1A1A2E',
        'background_color': '#0A0A1A',
        'sun_intensity': 10,
        'sun_direction': [0, -1, 0.1],
        'ambient_intensity': 0.1
    }
}


@app.route('/api/layout', methods=['GET'])
def get_layout():
    layout_id = request.args.get('id', 'living_40')
    layout = LAYOUTS.get(layout_id, LAYOUTS['living_40'])
    return jsonify({
        'success': True,
        'data': layout,
        'available_layouts': [
            {'id': k, 'name': v['name']} for k, v in LAYOUTS.items()
        ]
    })


@app.route('/api/calculate-lighting', methods=['POST'])
def calculate_lighting():
    try:
        data = request.get_json()
        lights = data.get('lights', [])
        layout_id = data.get('layout_id', 'living_40')
        time_preset = data.get('time_preset', 'afternoon_3')

        layout = LAYOUTS.get(layout_id, LAYOUTS['living_40'])
        natural_light = NATURAL_LIGHT_PRESETS.get(time_preset, NATURAL_LIGHT_PRESETS['afternoon_3'])

        room_polygon = [(p[0], p[1]) for p in layout['room_polygon']]
        furniture = layout['furniture']

        grid_data = lighting_engine.calculate_illuminance_grid(
            lights=lights,
            furniture=furniture,
            room_polygon=room_polygon,
            natural_light=natural_light
        )

        area_stats = []
        for area in layout.get('areas', []):
            area_poly = [(p[0], p[1]) for p in area['polygon']]
            avg_ill = lighting_engine.calculate_area_illuminance(grid_data, area_poly)
            area_stats.append({
                'name': area['name'],
                'avg_illuminance': round(avg_ill, 1),
                'recommended': area['recommended'],
                'is_below_recommended': avg_ill < area['recommended']
            })

        uniformity, evaluation = lighting_engine.calculate_uniformity(grid_data)

        min_ill = min((p['illuminance'] for p in grid_data), default=0)
        max_ill = max((p['illuminance'] for p in grid_data), default=0)
        avg_ill = sum((p['illuminance'] for p in grid_data)) / len(grid_data) if grid_data else 0

        dark_areas = []
        glare_areas = []
        for p in grid_data:
            if p['illuminance'] < 50:
                dark_areas.append({'x': p['x'], 'y': p['y'], 'illuminance': p['illuminance']})
            elif p['illuminance'] > 1500:
                glare_areas.append({'x': p['x'], 'y': p['y'], 'illuminance': p['illuminance']})

        return jsonify({
            'success': True,
            'data': {
                'grid_data': grid_data,
                'area_stats': area_stats,
                'uniformity': uniformity,
                'evaluation': evaluation,
                'statistics': {
                    'min': round(min_ill, 1),
                    'max': round(max_ill, 1),
                    'avg': round(avg_ill, 1)
                },
                'dark_areas': dark_areas,
                'glare_areas': glare_areas,
                'natural_light': natural_light
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/layouts', methods=['GET'])
def get_all_layouts():
    return jsonify({
        'success': True,
        'data': [
            {'id': k, 'name': v['name'], 'area': v['width'] * v['depth']}
            for k, v in LAYOUTS.items()
        ]
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
