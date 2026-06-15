import sys
sys.path.insert(0, '.')
from engine import simulate

chain = [
    {'id': 'root', 'name': '关卡开始', 'depth': 0},
    {'id': 'n1', 'name': '对话选项A', 'depth': 1},
    {'id': 'n1-1', 'name': '移动路径A1', 'depth': 2},
    {'id': 'n1-1-1', 'name': '战斗-胜利', 'depth': 3},
]
result = simulate(chain)
print(f'总分支: {result.total_branches}')
print(f'已触发: {result.triggered_branches}')
print(f'未触发: {result.untriggered_branches}')
print(f'覆盖率: {result.coverage_percent}%')
print()
print('节点状态:')
for n in result.nodes:
    print(f'  {n["id"]}: {n["status"]} (count={n["triggerCount"]})')
print()
print('边数量:', len(result.edges))
