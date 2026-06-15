from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class BranchRule:
    id: str
    name: str
    children: list["BranchRule"] = field(default_factory=list)


def load_branch_rules() -> BranchRule:
    return BranchRule(
        id="root",
        name="关卡开始",
        children=[
            BranchRule(
                id="n1",
                name="对话选项A",
                children=[
                    BranchRule(
                        id="n1-1",
                        name="移动路径A1",
                        children=[
                            BranchRule(id="n1-1-1", name="战斗-胜利"),
                            BranchRule(id="n1-1-2", name="战斗-失败"),
                        ],
                    ),
                    BranchRule(
                        id="n1-2",
                        name="移动路径A2",
                        children=[
                            BranchRule(id="n1-2-1", name="遭遇NPC"),
                        ],
                    ),
                ],
            ),
            BranchRule(
                id="n2",
                name="对话选项B",
                children=[
                    BranchRule(
                        id="n2-1",
                        name="移动路径B1",
                        children=[
                            BranchRule(id="n2-1-1", name="陷阱触发"),
                            BranchRule(id="n2-1-2", name="安全通过"),
                        ],
                    ),
                    BranchRule(
                        id="n2-2",
                        name="移动路径B2",
                        children=[
                            BranchRule(id="n2-2-1", name="隐藏宝箱"),
                            BranchRule(id="n2-2-2", name="Boss战"),
                        ],
                    ),
                ],
            ),
            BranchRule(
                id="n3",
                name="对话选项C",
                children=[
                    BranchRule(
                        id="n3-1",
                        name="分支剧情C1",
                        children=[
                            BranchRule(id="n3-1-1", name="结局-和平"),
                        ],
                    ),
                ],
            ),
        ],
    )


def count_total_branches(node: BranchRule) -> int:
    count = 1
    for child in node.children:
        count += count_total_branches(child)
    return count


@dataclass
class NodeMatchInfo:
    node: BranchRule
    triggered: bool = False
    partial: bool = False
    trigger_count: int = 0
    path: list[str] = field(default_factory=list)


def dfs_collect(
    node: BranchRule,
    chain_ids: set[str],
    chain_order: dict[str, int],
    path: list[str],
    result: dict[str, NodeMatchInfo],
    parent_triggered: bool,
) -> None:
    current_path = path + [node.id]
    in_chain = node.id in chain_ids

    triggered = parent_triggered and (in_chain or not node.children)
    if in_chain:
        triggered = True

    partial = False
    if not triggered:
        for child in node.children:
            if child.id in chain_ids:
                partial = True
                break

    trigger_count = 1 if in_chain else 0

    result[node.id] = NodeMatchInfo(
        node=node,
        triggered=triggered,
        partial=partial,
        trigger_count=trigger_count,
        path=current_path,
    )

    for child in node.children:
        dfs_collect(
            child,
            chain_ids,
            chain_order,
            current_path,
            result,
            triggered,
        )


@dataclass
class SimulationResult:
    nodes: list[dict]
    edges: list[dict]
    total_branches: int
    triggered_branches: int
    untriggered_branches: int
    coverage_percent: float


def simulate(decision_chain: list[dict]) -> SimulationResult:
    rules = load_branch_rules()
    chain_ids = {item["id"] for item in decision_chain}
    chain_order = {item["id"]: idx for idx, item in enumerate(decision_chain)}

    match_map: dict[str, NodeMatchInfo] = {}
    dfs_collect(rules, chain_ids, chain_order, [], match_map, False)

    total = count_total_branches(rules)
    triggered_count = sum(1 for info in match_map.values() if info.triggered)
    untriggered_count = total - triggered_count
    coverage = round((triggered_count / total) * 100, 1) if total > 0 else 0.0

    def status_for(info: NodeMatchInfo) -> str:
        if info.triggered:
            return "triggered"
        if info.partial:
            return "partial"
        return "untriggered"

    nodes_result = [
        {
            "id": info.node.id,
            "name": info.node.name,
            "status": status_for(info),
            "triggerCount": info.trigger_count,
            "path": info.path,
        }
        for info in match_map.values()
    ]

    edges_result: list[dict] = []

    def collect_edges(node: BranchRule) -> None:
        for child in node.children:
            child_info = match_map.get(child.id)
            parent_info = match_map.get(node.id)
            edge_triggered = False
            if child_info and parent_info:
                edge_triggered = child_info.triggered or (
                    parent_info.triggered and child.id in chain_ids
                )
            edges_result.append(
                {"source": node.id, "target": child.id, "triggered": edge_triggered}
            )
            collect_edges(child)

    collect_edges(rules)

    return SimulationResult(
        nodes=nodes_result,
        edges=edges_result,
        total_branches=total,
        triggered_branches=triggered_count,
        untriggered_branches=untriggered_count,
        coverage_percent=coverage,
    )
