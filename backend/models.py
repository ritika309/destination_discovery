from typing import List, Optional
from pydantic import BaseModel


class Message(BaseModel):
    role: str  # "user" or "model"
    content: str


class Persona(BaseModel):
    vibe: str
    destination_type: str
    country: str = ""


class Selections(BaseModel):
    food: str
    season: str
    weather: str
    time: str
    duration: str


class ChatRequest(BaseModel):
    messages: List[Message]
    persona: Persona
    selections: Selections
    destination: Optional[str] = None


class SuggestRequest(BaseModel):
    persona: Persona
    selections: Selections


class InterviewRequest(BaseModel):
    persona: Persona
    messages: List[Message] = []
