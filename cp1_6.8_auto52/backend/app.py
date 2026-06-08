from flask import Flask, request, jsonify
from flask_cors import CORS
import mystery_service

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"])


@app.route('/api/mysteries', methods=['GET'])
def get_mysteries():
    mysteries = mystery_service.get_all_mysteries()
    return jsonify({"mysteries": mysteries})


@app.route('/api/mysteries', methods=['POST'])
def create_mystery():
    data = request.get_json()
    if not data or 'riddle' not in data or 'answer' not in data:
        return jsonify({"error": "riddle and answer are required"}), 400
    if not data['riddle'].strip() or not data['answer'].strip():
        return jsonify({"error": "riddle and answer cannot be empty"}), 400
    result = mystery_service.create_mystery(data['riddle'], data['answer'])
    return jsonify(result), 201


@app.route('/api/mysteries/<mystery_id>', methods=['GET'])
def get_mystery(mystery_id):
    mystery = mystery_service.get_mystery_by_id(mystery_id)
    if not mystery:
        return jsonify({"error": "mystery not found"}), 404
    return jsonify(mystery)


@app.route('/api/mysteries/<mystery_id>/verify', methods=['POST'])
def verify_mystery(mystery_id):
    data = request.get_json()
    if not data or 'answer' not in data:
        return jsonify({"error": "answer is required"}), 400
    result = mystery_service.verify_answer(mystery_id, data['answer'])
    return jsonify(result)


@app.route('/api/solved', methods=['GET'])
def get_solved():
    solved = mystery_service.get_solved_mysteries()
    return jsonify({"solved": solved})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
