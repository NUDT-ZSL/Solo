from __future__ import annotations

from flask import Flask, jsonify, request
from flask_cors import CORS

from engine import simulate

app = Flask(__name__)
CORS(app)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "BranchVoyage Engine"})


@app.route("/api/simulate", methods=["POST"])
def simulate_endpoint():
    data = request.get_json(silent=True)
    if not data or "decisionChain" not in data:
        return (
            jsonify({"error": "缺少 decisionChain 参数"}),
            400,
        )

    decision_chain = data.get("decisionChain", [])
    if not isinstance(decision_chain, list):
        return (
            jsonify({"error": "decisionChain 必须为数组"}),
            400,
        )

    try:
        result = simulate(decision_chain)
    except Exception as exc:
        return (
            jsonify({"error": f"模拟执行错误: {exc}"}),
            500,
        )

    return jsonify(
        {
            "nodes": result.nodes,
            "edges": result.edges,
            "totalBranches": result.total_branches,
            "triggeredBranches": result.triggered_branches,
            "untriggeredBranches": result.untriggered_branches,
            "coveragePercent": result.coverage_percent,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
