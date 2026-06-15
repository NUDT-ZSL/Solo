from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)

entries = []


@app.route('/entries', methods=['GET'])
def get_entries():
    return jsonify(entries)


@app.route('/entries', methods=['POST'])
def create_entry():
    data = request.get_json()
    text = data.get('text', '')
    amount = data.get('amount', 0)
    emotion = data.get('emotion', '')

    if not text or not emotion:
        return jsonify({'error': 'text and emotion are required'}), 400

    entry = {
        'id': str(uuid.uuid4()),
        'text': text,
        'amount': amount,
        'emotion': emotion,
        'timestamp': datetime.now().isoformat()
    }
    entries.append(entry)
    return jsonify(entry), 201


if __name__ == '__main__':
    app.run(port=5000, debug=True)
