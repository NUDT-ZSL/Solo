import uuid
import random
from typing import List, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SkillDimension(BaseModel):
    id: str
    name: str


class MemberScore(BaseModel):
    id: str
    member_id: str
    skill_id: str
    quarter: str
    score: int = Field(..., ge=1, le=5)


class TeamMember(BaseModel):
    id: str
    name: str
    position: str
    order: int
    scores: List[MemberScore]


class CreateMemberRequest(BaseModel):
    name: str
    position: str


class CreateSkillRequest(BaseModel):
    name: str


class UpdateScoreRequest(BaseModel):
    member_id: str
    skill_id: str
    quarter: str
    score: int = Field(..., ge=1, le=5)


class UpdateOrderRequest(BaseModel):
    member_ids: List[str]


QUARTERS = ["2024Q1", "2024Q2", "2024Q3", "2024Q4"]
DEFAULT_SCORE = 3


def generate_scores_for_member(member_id: str, skills: List[SkillDimension]) -> List[MemberScore]:
    scores = []
    for skill in skills:
        for quarter in QUARTERS:
            scores.append(MemberScore(
                id=str(uuid.uuid4()),
                member_id=member_id,
                skill_id=skill.id,
                quarter=quarter,
                score=DEFAULT_SCORE,
            ))
    return scores


def generate_random_scores_for_member(member_id: str, skills: List[SkillDimension]) -> List[MemberScore]:
    scores = []
    for skill in skills:
        for quarter in QUARTERS:
            scores.append(MemberScore(
                id=str(uuid.uuid4()),
                member_id=member_id,
                skill_id=skill.id,
                quarter=quarter,
                score=random.randint(1, 5),
            ))
    return scores


skills_db: List[SkillDimension] = [
    SkillDimension(id=str(uuid.uuid4()), name="React"),
    SkillDimension(id=str(uuid.uuid4()), name="TypeScript"),
    SkillDimension(id=str(uuid.uuid4()), name="Python"),
    SkillDimension(id=str(uuid.uuid4()), name="沟通能力"),
    SkillDimension(id=str(uuid.uuid4()), name="项目管理"),
    SkillDimension(id=str(uuid.uuid4()), name="问题解决"),
]

members_db: List[TeamMember] = []

initial_members = [
    {"name": "张三", "position": "前端工程师"},
    {"name": "李四", "position": "后端工程师"},
    {"name": "王五", "position": "全栈工程师"},
    {"name": "赵六", "position": "产品经理"},
]

for idx, member_data in enumerate(initial_members):
    member_id = str(uuid.uuid4())
    members_db.append(TeamMember(
        id=member_id,
        name=member_data["name"],
        position=member_data["position"],
        order=idx + 1,
        scores=generate_random_scores_for_member(member_id, skills_db),
    ))


@app.get("/api/members")
def get_members():
    return sorted(members_db, key=lambda m: m.order)


@app.post("/api/members")
def create_member(request: CreateMemberRequest):
    member_id = str(uuid.uuid4())
    max_order = max((m.order for m in members_db), default=0)
    new_member = TeamMember(
        id=member_id,
        name=request.name,
        position=request.position,
        order=max_order + 1,
        scores=generate_scores_for_member(member_id, skills_db),
    )
    members_db.append(new_member)
    return new_member


@app.put("/api/members/order")
def update_member_order(request: UpdateOrderRequest):
    for idx, member_id in enumerate(request.member_ids):
        for member in members_db:
            if member.id == member_id:
                member.order = idx + 1
                break
    return sorted(members_db, key=lambda m: m.order)


@app.get("/api/skills")
def get_skills():
    return skills_db


@app.post("/api/skills")
def create_skill(request: CreateSkillRequest):
    skill_id = str(uuid.uuid4())
    new_skill = SkillDimension(id=skill_id, name=request.name)
    skills_db.append(new_skill)
    for member in members_db:
        for quarter in QUARTERS:
            member.scores.append(MemberScore(
                id=str(uuid.uuid4()),
                member_id=member.id,
                skill_id=skill_id,
                quarter=quarter,
                score=DEFAULT_SCORE,
            ))
    return new_skill


@app.post("/api/scores")
def update_score(request: UpdateScoreRequest):
    for member in members_db:
        if member.id == request.member_id:
            for score in member.scores:
                if score.skill_id == request.skill_id and score.quarter == request.quarter:
                    score.score = request.score
                    return score
    return {"error": "Score not found"}
