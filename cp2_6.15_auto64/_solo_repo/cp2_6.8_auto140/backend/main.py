from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

main = FastAPI(title="简历匹配API")

main.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Experience(BaseModel):
    title: str
    years: int


class Education(BaseModel):
    degree: str
    major: str


class Resume(BaseModel):
    name: str
    skills: List[str]
    experience: List[Experience]
    education: Education


class JobRequirement(BaseModel):
    id: str
    name: str
    skills: List[str]
    yearsExperience: int
    degree: str
    majorKeywords: List[str]


class MatchRequest(BaseModel):
    resume: Resume
    jobType: str


JOB_REQUIREMENTS = {
    "frontend": JobRequirement(
        id="frontend",
        name="前端工程师",
        skills=["React", "TypeScript", "CSS"],
        yearsExperience=3,
        degree="本科",
        majorKeywords=["计算机", "软件", "信息", "电子"],
    ),
    "backend": JobRequirement(
        id="backend",
        name="后端工程师",
        skills=["Python", "FastAPI", "Docker"],
        yearsExperience=4,
        degree="硕士",
        majorKeywords=["计算机", "软件", "信息"],
    ),
    "fullstack": JobRequirement(
        id="fullstack",
        name="全栈工程师",
        skills=["React", "Python", "AWS"],
        yearsExperience=5,
        degree="本科",
        majorKeywords=["计算机", "软件", "信息"],
    ),
}


DEGREE_SCORES = {
    "博士": 100,
    "博士后": 100,
    "PhD": 100,
    "Ph.D": 100,
    "硕士": 80,
    "研究生": 80,
    "Master": 80,
    "MBA": 80,
    "本科": 60,
    "学士": 60,
    "Bachelor": 60,
    "大专": 30,
    "专科": 30,
    "高中": 30,
    "中专": 30,
}


@main.post("/resume/parse")
async def parse_resume(resume: Resume):
    try:
        return {
            "name": resume.name,
            "skills": resume.skills,
            "experience": [
                {"title": exp.title, "years": exp.years} for exp in resume.experience
            ],
            "education": {
                "degree": resume.education.degree,
                "major": resume.education.major,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"解析失败: {str(e)}")


def calculate_degree_score(degree: str) -> int:
    for key, score in DEGREE_SCORES.items():
        if key in degree:
            return score
    return 30


def calculate_major_score(major: str, keywords: List[str]) -> int:
    if not keywords:
        return 50
    matched = sum(1 for kw in keywords if kw in major)
    if matched == 0:
        return 30
    return min(100, int((matched / len(keywords)) * 100) + 30)


def calculate_skill_score(resume_skills: List[str], required_skills: List[str]):
    if not required_skills:
        return 100, []
    resume_skills_lower = [s.lower() for s in resume_skills]
    matches = []
    matched_count = 0
    for skill in required_skills:
        matched = skill.lower() in resume_skills_lower
        matches.append({"skill": skill, "matched": matched})
        if matched:
            matched_count += 1
    score = int((matched_count / len(required_skills)) * 100)
    return score, matches


def calculate_experience_score(total_years: int, required_years: int) -> int:
    if required_years <= 0:
        return 100
    ratio = total_years / required_years
    if ratio >= 1.2:
        return 100
    return min(100, int(ratio * 100))


@main.post("/resume/match")
async def match_resume(request: MatchRequest):
    job = JOB_REQUIREMENTS.get(request.jobType)
    if not job:
        raise HTTPException(status_code=400, detail="未知的岗位类型")

    resume = request.resume

    skill_score, skill_matches = calculate_skill_score(resume.skills, job.skills)

    total_years = sum(exp.years for exp in resume.experience)
    experience_score = calculate_experience_score(total_years, job.yearsExperience)

    degree_percent = calculate_degree_score(resume.education.degree)
    major_score = calculate_major_score(resume.education.major, job.majorKeywords)
    education_score = int((degree_percent + major_score) / 2)

    overall_score = int(skill_score * 0.5 + experience_score * 0.3 + education_score * 0.2)

    return {
        "overallScore": overall_score,
        "skillScore": skill_score,
        "experienceScore": experience_score,
        "educationScore": education_score,
        "skillMatches": skill_matches,
        "experienceDetail": {
            "totalYears": total_years,
            "requiredYears": job.yearsExperience,
        },
        "educationDetail": {
            "degreeScore": degree_percent,
            "majorScore": major_score,
            "degreePercent": degree_percent,
        },
    }


@main.get("/")
async def root():
    return {"message": "简历匹配API服务运行中"}
