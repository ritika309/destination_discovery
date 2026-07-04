import os

from fastapi import APIRouter

from gemini_utils import extract_json
from models import SuggestRequest

router = APIRouter()

# Fallback destination options if Gemini key is missing or JSON parsing fails
FALLBACK_DESTINATIONS = [
    {
        "name": "Kyoto",
        "country": "Japan",
        "tagline": "Ancient temples, quiet bamboo groves, and centuries-old rituals.",
        "matchReason": "A calm, culture-rich pick that suits most vibes and seasons."
    },
    {
        "name": "Lisbon",
        "country": "Portugal",
        "tagline": "Sun-drenched hills, tiled facades, and fado echoing through alleyways.",
        "matchReason": "Great mix of food, coastline, and history for a flexible trip length."
    },
    {
        "name": "Chiang Mai",
        "country": "Thailand",
        "tagline": "Misty mountains, night markets, and warm community life.",
        "matchReason": "Ideal for foodies and explorers wanting an affordable, immersive stay."
    }
]


@router.post("/api/suggest-destinations")
def suggest_destinations(req: SuggestRequest):
    gemini_key = os.getenv("GEMINI_API_KEY")

    if not gemini_key:
        return {"destinations": FALLBACK_DESTINATIONS}

    prompt = (
        "You are a travel destination recommender. Based on the traveler profile below, "
        "suggest exactly 3 real-world destinations (specific cities/regions, not countries) that fit well. "
        "If a preferred country/region is given, all 3 suggestions should be within it; otherwise suggest "
        "anywhere in the world.\n\n"
        f"Travel Vibe: {req.persona.vibe}\n"
        f"Preferred Destination Type: {req.persona.destination_type}\n"
        f"Preferred Country/Region: {req.persona.country or 'No preference, anywhere is fine'}\n"
        f"Food Preference: {req.selections.food}\n"
        f"Season: {req.selections.season}\n"
        f"Preferred Weather: {req.selections.weather}\n"
        f"Preferred Time of Day: {req.selections.time}\n"
        f"Trip Duration: {req.selections.duration}\n\n"
        "Respond with ONLY a JSON array (no markdown, no commentary) of exactly 3 objects, each shaped as:\n"
        '{"name": "City", "country": "Country", "tagline": "one evocative sentence", '
        '"matchReason": "one sentence on why it fits this traveler"}'
    )

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=gemini_key)
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.8,
        )
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=config
        )
        parsed = extract_json(response.text)
        if isinstance(parsed, list) and len(parsed) > 0:
            return {"destinations": parsed[:3]}
    except Exception as e:
        print(f"Gemini suggest-destinations failure: {e}")

    return {"destinations": FALLBACK_DESTINATIONS}
