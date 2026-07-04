import os

from fastapi import APIRouter

from gemini_utils import extract_json
from models import InterviewRequest, Message

router = APIRouter()

# Fixed fallback question order used only when no Gemini key is configured
INTERVIEW_FALLBACK_QUESTIONS = [
    "Ooh I'd love to help you plan something magical! 🤤 What kind of food are you craving on this trip?",
    "Yum! 🍕 What season are you thinking of traveling in?",
    "Nice! ☁️ What kind of weather do you love most?",
    "Got it! 🕒 When are you most excited to explore — morning, afternoon, or evening?",
    "Almost there! 🧭 How long is this adventure — a weekend, a week, or longer?"
]


def _mock_interview_turn(req: InterviewRequest):
    turn = len([m for m in req.messages if m.role == "user"])
    if turn < len(INTERVIEW_FALLBACK_QUESTIONS):
        return {
            "reply": INTERVIEW_FALLBACK_QUESTIONS[turn],
            "done": False,
            "preferences": {},
            "directDestination": None
        }
    return {
        "reply": "Perfect, I think I have a great feel for your trip now! 🗺️✨ Let me find some spots you'll love...",
        "done": True,
        "preferences": {
            "food": "Local Classics",
            "season": "Summer",
            "weather": "Sunny",
            "time": "Evening",
            "duration": "1 Week"
        },
        "directDestination": None
    }


@router.post("/api/interview")
def interview(req: InterviewRequest):
    gemini_key = os.getenv("GEMINI_API_KEY")

    if not gemini_key:
        return _mock_interview_turn(req)

    system_instruction = (
        "You are 'Aura', a cutesy, warm, expert travel companion chatbot having a natural, flowing "
        "conversation (NOT a rigid checklist or interrogation) to learn about a traveler's trip preferences.\n\n"
        f"Traveler's general profile — Travel Vibe: {req.persona.vibe}, "
        f"Preferred Destination Type: {req.persona.destination_type}, "
        f"Preferred Country/Region: {req.persona.country or 'no preference'}.\n\n"
        "Your goal is to naturally learn their: food preference, season of travel, preferred weather, "
        "preferred time of day to explore, and trip duration — through genuine back-and-forth conversation, "
        "asking ONE warm, playful question at a time, reacting to what they just said before asking the next "
        "thing. Vary your phrasing and tone, don't just recite a checklist. If the traveler mentions a specific "
        "destination they already want to visit at any point, capture it.\n\n"
        "If the traveler says something like 'surprise me', 'just pick for me', or otherwise wants to skip "
        "ahead, or once you have learned enough about food/season/weather/time/duration to make good "
        "recommendations, mark the interview as done.\n\n"
        "Respond with ONLY strict JSON (no markdown, no commentary), shaped exactly as:\n"
        '{"reply": "<your warm conversational message to show the traveler now>", '
        '"done": <true or false>, '
        '"preferences": {"food": "<best guess so far, or empty string>", "season": "<...>", '
        '"weather": "<...>", "time": "<...>", "duration": "<...>"}, '
        '"directDestination": "<a specific destination the traveler explicitly named, or null>"}\n\n'
        'The "reply" field is the ONLY thing the traveler will see, so it must read as one natural chat '
        "message (never mention JSON, fields, or that you are collecting data)."
    )

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=gemini_key)

        # Drop any leading non-user turns (e.g. a client-side greeting) so the call starts on a user turn.
        msgs = req.messages
        while msgs and msgs[0].role != "user":
            msgs = msgs[1:]
        if not msgs:
            msgs = [Message(role="user", content="Hi Aura! I'm ready to start planning my trip.")]

        contents = []
        for msg in msgs:
            role = "user" if msg.role == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg.content)]))

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            temperature=0.8,
        )
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=config
        )
        parsed = extract_json(response.text)
        if isinstance(parsed, dict) and "reply" in parsed:
            return {
                "reply": parsed.get("reply", ""),
                "done": bool(parsed.get("done", False)),
                "preferences": parsed.get("preferences") or {},
                "directDestination": parsed.get("directDestination") or None
            }
    except Exception as e:
        print(f"Gemini interview failure: {e}")

    return _mock_interview_turn(req)
