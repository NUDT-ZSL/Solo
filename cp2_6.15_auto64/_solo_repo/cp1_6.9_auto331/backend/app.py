from flask import Flask, request, jsonify, send_from_directory
import json
import os
from datetime import datetime
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

SAVE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'saves')
os.makedirs(SAVE_DIR, exist_ok=True)


@app.route('/api/save', methods=['POST'])
def save_project():
    try:
        data = request.get_json()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'dialogue_tree_{timestamp}.json'
        filepath = os.path.join(SAVE_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return jsonify({'success': True, 'filename': filename, 'filepath': filepath})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/load', methods=['POST'])
def load_project():
    try:
        if 'file' in request.files:
            file = request.files['file']
            data = json.load(file)
        else:
            body = request.get_json()
            filename = body.get('filename')
            if not filename:
                return jsonify({'success': False, 'error': 'No file provided'}), 400
            filepath = os.path.join(SAVE_DIR, filename)
            if not os.path.exists(filepath):
                return jsonify({'success': False, 'error': 'File not found'}), 404
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
        return jsonify({'success': True, 'data': data})
    except json.JSONDecodeError:
        return jsonify({'success': False, 'error': 'Invalid JSON format'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/projects', methods=['GET'])
def list_projects():
    try:
        files = []
        for f in sorted(os.listdir(SAVE_DIR), reverse=True):
            if f.endswith('.json'):
                filepath = os.path.join(SAVE_DIR, f)
                stat = os.stat(filepath)
                files.append({
                    'filename': f,
                    'created_at': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    'size': stat.st_size
                })
        return jsonify({'success': True, 'projects': files})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    print('Dialogue Weaver Backend starting on http://localhost:5000')
    app.run(host='0.0.0.0', port=5000, debug=True)
