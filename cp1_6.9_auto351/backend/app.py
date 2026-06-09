import json
import os
import random
import uuid
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATA_FILE = os.path.join(os.path.dirname(__file__), 'trails_data.json')

WARM_COLORS = [
    '#ff6b6b', '#ffa94d', '#ffd43b', '#ff922b', '#fa5252',
    '#ff6348', '#ff7f50', '#ff4500', '#dc143c', '#ff1493'
]


def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def init_mock_data():
    if os.path.exists(DATA_FILE):
        return
    now = datetime.now()
    mock_data = [
        {
            'id': str(uuid.uuid4()),
            'url': 'https://react.dev',
            'title': 'React - 用于构建用户界面的 JavaScript 库',
            'duration': 185,
            'scrollDepth': 78,
            'themeColor': '#61dafb',
            'visitedAt': (now - timedelta(days=3, hours=2)).isoformat(),
            'category': '技术文档'
        },
        {
            'id': str(uuid.uuid4()),
            'url': 'https://threejs.org',
            'title': 'Three.js - JavaScript 3D 库',
            'duration': 420,
            'scrollDepth': 92,
            'themeColor': '#ffffff',
            'visitedAt': (now - timedelta(days=2, hours=5)).isoformat(),
            'category': '技术文档'
        },
        {
            'id': str(uuid.uuid4()),
            'url': 'https://github.com',
            'title': 'GitHub: Let\'s build from here',
            'duration': 600,
            'scrollDepth': 65,
            'themeColor': '#24292e',
            'visitedAt': (now - timedelta(days=1, hours=8)).isoformat(),
            'category': '开发工具'
        },
        {
            'id': str(uuid.uuid4()),
            'url': 'https://dribbble.com',
            'title': 'Dribbble - Discover the World\'s Top Designers',
            'duration': 300,
            'scrollDepth': 55,
            'themeColor': '#ea4c89',
            'visitedAt': (now - timedelta(hours=12)).isoformat(),
            'category': '设计灵感'
        },
        {
            'id': str(uuid.uuid4()),
            'url': 'https://developer.mozilla.org',
            'title': 'MDN Web Docs',
            'duration': 540,
            'scrollDepth': 88,
            'themeColor': '#000000',
            'visitedAt': (now - timedelta(hours=2)).isoformat(),
            'category': '技术文档'
        }
    ]
    save_data(mock_data)


init_mock_data()


def extract_theme_color(url):
    return random.choice(WARM_COLORS)


def is_duplicate(trails, url):
    for idx, trail in enumerate(trails):
        if trail['url'] == url:
            return idx
    return -1


@app.route('/api/trails', methods=['GET'])
def get_trails():
    trails = load_data()
    return jsonify({'success': True, 'data': trails})


@app.route('/api/trails', methods=['POST'])
def add_trail():
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({'success': False, 'error': '缺少必要参数 url'}), 400

    trails = load_data()
    url = data['url']
    title = data.get('title', url)
    duration = int(data.get('duration', random.randint(30, 600)))
    scroll_depth = int(data.get('scrollDepth', random.randint(10, 100)))
    theme_color = data.get('themeColor') or extract_theme_color(url)
    category = data.get('category', '其他')

    dup_idx = is_duplicate(trails, url)
    if dup_idx >= 0:
        trails[dup_idx]['duration'] += duration
        trails[dup_idx]['visitedAt'] = datetime.now().isoformat()
        trails[dup_idx]['scrollDepth'] = max(trails[dup_idx]['scrollDepth'], scroll_depth)
        save_data(trails)
        return jsonify({'success': True, 'data': trails[dup_idx], 'updated': True})

    new_trail = {
        'id': str(uuid.uuid4()),
        'url': url,
        'title': title,
        'duration': duration,
        'scrollDepth': scroll_depth,
        'themeColor': theme_color,
        'visitedAt': datetime.now().isoformat(),
        'category': category
    }
    trails.append(new_trail)
    save_data(trails)
    return jsonify({'success': True, 'data': new_trail, 'updated': False}), 201


@app.route('/api/trails/<trail_id>', methods=['DELETE'])
def delete_trail(trail_id):
    trails = load_data()
    original_len = len(trails)
    trails = [t for t in trails if t['id'] != trail_id]
    if len(trails) == original_len:
        return jsonify({'success': False, 'error': '未找到该足迹'}), 404
    save_data(trails)
    return jsonify({'success': True})


@app.route('/api/trails', methods=['DELETE'])
def clear_trails():
    save_data([])
    return jsonify({'success': True})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
