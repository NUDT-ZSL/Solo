from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from enum import Enum
import uuid
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GrowthStage(int, Enum):
    seed = 0
    sprout = 1
    seedling = 2
    mature = 3
    flowering = 4


class FlowerShape(str, Enum):
    symmetric = "symmetric"
    spiral = "spiral"


class GrowthAction(str, Enum):
    water = "water"
    nutrient = "nutrient"
    light = "light"


class PlantState(BaseModel):
    id: str
    name: str
    stage: GrowthStage = GrowthStage.seed
    water: float = 0
    nutrient: float = 0
    light: float = 0
    energy: float = 100
    last_interaction: float = 0
    flower_color: Optional[str] = None
    flower_shape: Optional[FlowerShape] = None
    growth_path: list[GrowthAction] = []


class CreatePlantRequest(BaseModel):
    name: str


class ActionRequest(BaseModel):
    action: GrowthAction


class ActionResponse(BaseModel):
    plant: PlantState
    evolved: bool = False
    new_stage: Optional[GrowthStage] = None


class DecayResponse(BaseModel):
    plant: PlantState
    is_withering: bool = False


STAGE_THRESHOLDS = {
    GrowthStage.seed: 0,
    GrowthStage.sprout: 30,
    GrowthStage.seedling: 80,
    GrowthStage.mature: 150,
    GrowthStage.flowering: 250,
}

plants_db: dict[str, PlantState] = {}


def compute_flower_color(plant: PlantState) -> str:
    total = plant.water + plant.nutrient + plant.light
    if total == 0:
        return "hsl(120, 60%, 55%)"
    w_ratio = plant.water / total
    n_ratio = plant.nutrient / total
    l_ratio = plant.light / total
    h = int((w_ratio * 200 + n_ratio * 80 + l_ratio * 45) % 360)
    ratios = [w_ratio, n_ratio, l_ratio]
    max_diff = max(ratios) - min(ratios)
    s = int(60 + max_diff * 30)
    l_val = int(55 + (plant.energy / 200) * 15)
    return f"hsl({h}, {s}%, {l_val}%)"


def compute_flower_shape(plant: PlantState) -> FlowerShape:
    if not plant.growth_path:
        return FlowerShape.symmetric
    water_count = plant.growth_path.count(GrowthAction.water)
    if water_count > len(plant.growth_path) / 3:
        return FlowerShape.spiral
    return FlowerShape.symmetric


def get_next_stage(current: GrowthStage, total_attrs: float) -> Optional[GrowthStage]:
    stages = list(GrowthStage)
    for i in range(len(stages) - 1):
        if current == stages[i] and total_attrs >= STAGE_THRESHOLDS[stages[i + 1]]:
            return stages[i + 1]
    return None


@app.get("/api/plants")
def get_plants():
    return list(plants_db.values())


@app.post("/api/plants", response_model=PlantState)
def create_plant(req: CreatePlantRequest):
    if len(plants_db) >= 5:
        raise HTTPException(status_code=400, detail="最多只能创建5株植物")
    plant = PlantState(
        id=str(uuid.uuid4())[:8],
        name=req.name,
        last_interaction=time.time(),
    )
    plants_db[plant.id] = plant
    return plant


@app.post("/api/plants/{plant_id}/action", response_model=ActionResponse)
def perform_action(plant_id: str, req: ActionRequest):
    if plant_id not in plants_db:
        raise HTTPException(status_code=404, detail="植物不存在")
    plant = plants_db[plant_id]
    if plant.stage == GrowthStage.flowering:
        raise HTTPException(status_code=400, detail="植物已开花，无法继续操作")

    if plant.energy < 5:
        raise HTTPException(status_code=400, detail="能量不足")

    effects = {
        GrowthAction.water: ("water", 15),
        GrowthAction.nutrient: ("nutrient", 15),
        GrowthAction.light: ("light", 15),
    }
    attr, delta = effects[req.action]
    setattr(plant, attr, min(100, getattr(plant, attr) + delta))
    plant.energy = max(0, plant.energy - 5)
    plant.last_interaction = time.time()
    plant.growth_path.append(req.action)

    total_attrs = plant.water + plant.nutrient + plant.light
    evolved = False
    new_stage = None
    next_stage = get_next_stage(plant.stage, total_attrs)
    if next_stage is not None:
        plant.stage = next_stage
        evolved = True
        new_stage = next_stage

    if plant.stage == GrowthStage.flowering:
        plant.flower_color = compute_flower_color(plant)
        plant.flower_shape = compute_flower_shape(plant)

    plants_db[plant_id] = plant
    return ActionResponse(plant=plant, evolved=evolved, new_stage=new_stage)


@app.post("/api/plants/{plant_id}/decay", response_model=DecayResponse)
def decay_plant(plant_id: str):
    if plant_id not in plants_db:
        raise HTTPException(status_code=404, detail="植物不存在")
    plant = plants_db[plant_id]
    elapsed = time.time() - plant.last_interaction
    is_withering = elapsed > 60

    if is_withering:
        plant.water = max(0, plant.water * 0.95)
        plant.nutrient = max(0, plant.nutrient * 0.95)
        plant.light = max(0, plant.light * 0.95)
        plant.last_interaction = time.time()
        plants_db[plant_id] = plant

    return DecayResponse(plant=plant, is_withering=is_withering)


@app.delete("/api/plants/{plant_id}")
def delete_plant(plant_id: str):
    if plant_id not in plants_db:
        raise HTTPException(status_code=404, detail="植物不存在")
    del plants_db[plant_id]
    return {"success": True}


@app.post("/api/plants/{plant_id}/energy")
def recover_energy(plant_id: str):
    if plant_id not in plants_db:
        raise HTTPException(status_code=404, detail="植物不存在")
    plant = plants_db[plant_id]
    plant.energy = min(100, plant.energy + 10)
    plants_db[plant_id] = plant
    return plant


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
