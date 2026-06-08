import os
import json
import uuid
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
BOTTLES_FILE = os.path.join(DATA_DIR, 'bottles.json')
RESONATIONS_FILE = os.path.join(DATA_DIR, 'resonations.json')

TAG_COLORS = {
    '雨后泥土': '#8B6914',
    '老樟木箱': '#C4A35A',
    '海风咸味': '#4A9BD9',
    '桂花甜香': '#FFD700',
    '旧书墨香': '#8B7355',
    '晨露草青': '#6B8E23',
    '焦糖暖意': '#D2691E',
    '雪松清冷': '#5F9EA0',
    '柚子酸涩': '#FF8C00',
    '烟火人间': '#CD5C5C',
}

SEED_BOTTLES = [
    {'content': '雨后的泥土味，让我想起外婆家的后院，那种湿润又踏实的安心感', 'tag': '雨后泥土'},
    {'content': '打开老樟木箱的一瞬间，那是时光封存的味道，带着一点点辛辣的木香', 'tag': '老樟木箱'},
    {'content': '站在礁石上，海风带着咸味扑面而来，所有的烦恼都被吹散了', 'tag': '海风咸味'},
    {'content': '秋天路过巷口，满树桂花甜香飘来，整条街都变成了蜜糖色', 'tag': '桂花甜香'},
    {'content': '翻开旧书页，油墨和纸张混合的气息像是一场安静的时间旅行', 'tag': '旧书墨香'},
    {'content': '清晨踩过草地，露水沾湿鞋面，空气里全是青草被碾碎的清新', 'tag': '晨露草青'},
    {'content': '冬天厨房里焦糖在锅里慢慢融化，暖意从胃里升腾到心里', 'tag': '焦糖暖意'},
    {'content': '雪山的空气是冷冽的，带着松木的清香，像被整个世界轻轻抱住', 'tag': '雪松清冷'},
    {'content': '剥开柚子皮的瞬间，酸涩的精油飞溅到指尖，鼻腔一酸却让人清醒', 'tag': '柚子酸涩'},
    {'content': '除夕夜鞭炮声后，硝烟味混着饺子的香气，这就是人间烟火吧', 'tag': '烟火人间'},
    {'content': '梅雨季节推开窗，湿润的空气里混着青苔和旧墙的味道', 'tag': '雨后泥土'},
    {'content': '老书房里沉香袅袅，木质的香气像一条缓缓流淌的河', 'tag': '老樟木箱'},
    {'content': '傍晚海边的风变凉了，但咸味里多了一丝温柔', 'tag': '海风咸味'},
    {'content': '外婆的院子里桂花开了，甜到心里去的那种温柔', 'tag': '桂花甜香'},
    {'content': '图书馆角落那本积灰的书，翻开是另一个时空的味道', 'tag': '旧书墨香'},
]


def _ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def _load_json(filepath):
    if not os.path.exists(filepath):
        return []
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def _save_json(filepath, data):
    _ensure_data_dir()
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _init_seed_data():
    bottles = _load_json(BOTTLES_FILE)
    if len(bottles) > 0:
        return
    for i, seed in enumerate(SEED_BOTTLES):
        bottles.append({
            'id': f'btl_seed_{i}',
            'content': seed['content'],
            'tag': seed['tag'],
            'color': TAG_COLORS.get(seed['tag'], '#4A9BD9'),
            'resonances': 0,
            'createdAt': datetime.utcnow().isoformat() + 'Z',
            'userId': 'seed_user',
            'resonatedBy': [],
        })
    _save_json(BOTTLES_FILE, bottles)
    _save_json(RESONATIONS_FILE, [])


_init_seed_data()


@app.route('/api/bottles', methods=['GET'])
def get_bottles():
    user_id = request.args.get('userId', '')
    bottles = _load_json(BOTTLES_FILE)
    if user_id:
        bottles = [b for b in bottles if b['userId'] == user_id]
    return jsonify({'success': True, 'data': bottles})


@app.route('/api/bottles', methods=['POST'])
def create_bottle():
    body = request.get_json(force=True)
    content = body.get('content', '').strip()
    tag = body.get('tag', '').strip()
    user_id = body.get('userId', '')

    if not content or not tag or not user_id:
        return jsonify({'success': False, 'error': '缺少必填字段'}), 400

    if len(content) > 150:
        return jsonify({'success': False, 'error': '气味笔记不能超过150字'}), 400

    color = TAG_COLORS.get(tag, '#4A9BD9')

    bottle = {
        'id': f'btl_{uuid.uuid4().hex[:8]}',
        'content': content,
        'tag': tag,
        'color': color,
        'resonances': 0,
        'createdAt': datetime.utcnow().isoformat() + 'Z',
        'userId': user_id,
        'resonatedBy': [],
    }

    bottles = _load_json(BOTTLES_FILE)
    bottles.append(bottle)
    _save_json(BOTTLES_FILE, bottles)

    return jsonify({'success': True, 'data': bottle})


@app.route('/api/resonate', methods=['POST'])
def resonate():
    body = request.get_json(force=True)
    bottle_id = body.get('bottleId', '')
    user_id = body.get('userId', '')

    if not bottle_id or not user_id:
        return jsonify({'success': False, 'error': '缺少必填字段'}), 400

    bottles = _load_json(BOTTLES_FILE)
    target = None
    for b in bottles:
        if b['id'] == bottle_id:
            target = b
            break

    if not target:
        return jsonify({'success': False, 'error': '漂流瓶不存在'}), 404

    if user_id in target['resonatedBy']:
        return jsonify({'success': False, 'error': '你已经共鸣过这个瓶子了'}), 400

    target['resonatedBy'].append(user_id)
    target['resonances'] = len(target['resonatedBy'])
    _save_json(BOTTLES_FILE, bottles)

    resonations = _load_json(RESONATIONS_FILE)
    resonations.append({
        'id': f'rsn_{uuid.uuid4().hex[:8]}',
        'bottleId': bottle_id,
        'userId': user_id,
        'createdAt': datetime.utcnow().isoformat() + 'Z',
    })
    _save_json(RESONATIONS_FILE, resonations)

    return jsonify({'success': True, 'data': target})


@app.route('/api/my-bottles', methods=['GET'])
def get_my_bottles():
    user_id = request.args.get('userId', '')
    if not user_id:
        return jsonify({'success': False, 'error': '缺少userId'}), 400

    bottles = _load_json(BOTTLES_FILE)
    sent = [b for b in bottles if b['userId'] == user_id]
    resonated = [b for b in bottles if user_id in b.get('resonatedBy', [])]

    return jsonify({
        'success': True,
        'data': {
            'sent': sent,
            'resonated': resonated,
        }
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
