from dataclasses import dataclass, field
from typing import List, Dict, Optional
import uuid


@dataclass
class Sculpture:
    id: str
    title: str
    artist: str
    description: str
    material_type: str
    model_url: str
    geometry_type: str = "torusKnot"
    color: str = "#b87333"
    scale: float = 1.0


@dataclass
class Snapshot:
    id: str
    sculpture_id: str
    position: Dict[str, float]
    target: Dict[str, float]
    zoom: float
    image_base64: str
    click_count: int = 0


_initial_sculptures: List[Sculpture] = [
    Sculpture(
        id="scu-001",
        title="青铜时代",
        artist="奥古斯特·罗丹",
        description="罗丹的代表作之一，象征着人类从蒙昧中觉醒的过程。雕像以其舒展的姿态和流畅的线条展现了青春的力量。",
        material_type="青铜",
        model_url="/models/bronze-age.glb",
        geometry_type="torusKnot",
        color="#cd7f32",
        scale=1.2
    ),
    Sculpture(
        id="scu-002",
        title="大卫",
        artist="米开朗基罗",
        description="文艺复兴时期最著名的雕塑作品，展现了完美的人体比例与英雄气概。5.17米高的大理石巨作。",
        material_type="大理石",
        model_url="/models/david.glb",
        geometry_type="dodecahedron",
        color="#f5f5f5",
        scale=1.5
    ),
    Sculpture(
        id="scu-003",
        title="思想者",
        artist="奥古斯特·罗丹",
        description="罗丹《地狱之门》组塑的一部分，后成为独立作品。深沉思考的姿态成为人类智慧的象征。",
        material_type="青铜",
        model_url="/models/thinker.glb",
        geometry_type="icosahedron",
        color="#8b4513",
        scale=1.0
    ),
    Sculpture(
        id="scu-004",
        title="米洛的维纳斯",
        artist="亚历山德罗斯",
        description="古希腊雕塑的巅峰之作，展现了爱与美的女神阿芙洛狄忒的优雅。残缺的双臂更增添了想象空间。",
        material_type="大理石",
        model_url="/models/venus.glb",
        geometry_type="octahedron",
        color="#f0ebe0",
        scale=1.3
    ),
    Sculpture(
        id="scu-005",
        title="萨莫色雷斯的胜利女神",
        artist="古希腊佚名",
        description="公元前2世纪的希腊化时期杰作，女神站在船头张开双翼迎接胜利。动感与优雅的完美结合。",
        material_type="大理石",
        model_url="/models/nike.glb",
        geometry_type="tetrahedron",
        color="#e8e0d0",
        scale=1.4
    ),
    Sculpture(
        id="scu-006",
        title="永恒之春",
        artist="奥古斯特·罗丹",
        description="罗丹以青铜铸造的爱情主题雕塑，一对相拥的恋人展现了爱情的热烈与永恒。",
        material_type="青铜",
        model_url="/models/eternal-spring.glb",
        geometry_type="torus",
        color="#b87333",
        scale=1.1
    )
]

_snapshots: List[Snapshot] = []
_initialized = False


def initialize_data():
    global _initialized, _snapshots
    if _initialized:
        return
    _initialized = True
    _snapshots = [
        Snapshot(
            id=f"snap-init-{i}",
            sculpture_id=_initial_sculptures[i % len(_initial_sculptures)].id,
            position={"x": 7.5 * 1.0, "y": 2.0 + i * 0.3, "z": 0.0},
            target={"x": 0.0, "y": 1.0, "z": 0.0},
            zoom=5.0,
            image_base64="",
            click_count=42 - i * 5
        )
        for i in range(6)
    ]


def get_all_sculptures() -> List[Sculpture]:
    initialize_data()
    return _initial_sculptures


def get_sculpture_by_id(sculpture_id: str) -> Optional[Sculpture]:
    initialize_data()
    return next((s for s in _initial_sculptures if s.id == sculpture_id), None)


def create_snapshot(
    sculpture_id: str,
    position: Dict[str, float],
    target: Dict[str, float],
    zoom: float,
    image_base64: str
) -> Snapshot:
    initialize_data()
    snapshot = Snapshot(
        id=f"snap-{uuid.uuid4().hex[:12]}",
        sculpture_id=sculpture_id,
        position=position,
        target=target,
        zoom=zoom,
        image_base64=image_base64,
        click_count=0
    )
    _snapshots.append(snapshot)
    return snapshot


def increment_snapshot_clicks(snapshot_id: str) -> Optional[Snapshot]:
    initialize_data()
    snap = next((s for s in _snapshots if s.id == snapshot_id), None)
    if snap:
        snap.click_count += 1
    return snap


def get_featured_snapshots(limit: int = 12) -> List[Snapshot]:
    initialize_data()
    sorted_snaps = sorted(_snapshots, key=lambda s: s.click_count, reverse=True)
    return sorted_snaps[:limit]
