import os

from fastapi import APIRouter, HTTPException

from models import ChatRequest

router = APIRouter()

PLAN_SECTIONS = (
    "### 💎 Uncovering Hidden Gems\n"
    "[List 2-3 secret spots, local pathways, or lesser-known sights tailored to their selections, explain why they match their vibe]\n\n"
    "### 📖 Famous Story of That Place\n"
    "[Tell a captivating local myth, legend, historical tale, or famous story that brings the place to life]\n\n"
    "### 🎨 Culture & Traditions\n"
    "[Describe local traditions, food etiquette, cultural habits, and unique lifestyle traits of the residents]\n\n"
    "### 🎉 Local Events & Meetups\n"
    "[Give ideas on how they can connect with local communities (e.g. food markets, community workshops, local boardgame cafes, or small seasonal festivals)]\n\n"
)


def _traveler_profile(req: ChatRequest) -> str:
    return (
        f"The traveler's general profile:\n"
        f"- Travel Vibe: {req.persona.vibe}\n"
        f"- Preferred Destination Type: {req.persona.destination_type}\n"
        f"- Preferred Country/Region: {req.persona.country or 'No preference'}\n\n"
        f"Their current chat context selections:\n"
        f"- Food Preference: {req.selections.food}\n"
        f"- Season: {req.selections.season}\n"
        f"- Current Weather: {req.selections.weather}\n"
        f"- Time of Day: {req.selections.time}\n"
        f"- Trip Duration: {req.selections.duration}\n\n"
    )


def _build_system_instruction(req: ChatRequest, is_first_message: bool) -> str:
    traveler_profile = _traveler_profile(req)

    if req.destination:
        return (
            "You are 'Aura', a cutesy, friendly, and expert local travel companion chatbot. "
            f"The traveler has ALREADY chosen their destination: {req.destination}. Every response you give "
            f"MUST be specifically about {req.destination} — never invent or suggest a different place.\n\n"
            + traveler_profile
            + (
                "CRITICAL: This is the very first message about this destination. Do NOT ask any clarifying "
                "questions, do NOT make small talk, and do NOT offer choices. Your ENTIRE response must "
                f"immediately be the structured plan below, fully written out for {req.destination}, using "
                "these exact Markdown headers with emojis:\n\n" + PLAN_SECTIONS +
                "Keep it highly personalized, magical, and warm! Start your response with one short warm "
                "sentence of excitement, then go straight into the sections above."
                if is_first_message else
                "This is a follow-up message in an ongoing conversation about that destination. Respond "
                "concisely and specifically to what the traveler just asked (e.g. more hidden gems, more "
                "events, or a general question), staying grounded in this destination. Only repeat the full "
                "4-section structured format if they explicitly ask for the whole plan again."
            )
        )

    return (
        "You are 'Aura', a cutesy, friendly, and expert local travel companion chatbot. "
        "Your mission is to help travelers discover unique destinations and connect deeply with local culture.\n\n"
        + traveler_profile +
        "Guidelines:\n"
        "1. Start by asking conversational questions or offering playful ideas. Use cute travel emojis and a friendly tone.\n"
        "2. If the user asks for a recommendation, has answered questions, or says they are ready for their plan, you MUST generate a beautifully structured destination discovery plan.\n"
        "3. The final plan MUST contain these 4 sections (using exact Markdown headers) formatted beautifully with emojis:\n\n"
        + PLAN_SECTIONS +
        "Keep it highly personalized, magical, and warm!"
    )


def _mock_chat_response(req: ChatRequest) -> str:
    demo_destination = req.destination or "Kyoto, Japan"
    return (
        f"Hi there! 🎒✨ I see your vibe is **{req.persona.vibe}** and you love **{req.persona.destination_type}**! "
        f"Since you chose **{req.selections.food}** food, **{req.selections.weather}** weather, and a **{req.selections.duration}** trip, "
        f"here is a special preview destination discovery plan (demo data) for **{demo_destination}**!\n\n"
        "### 💎 Uncovering Hidden Gems\n"
        "* **Gio-ji Temple**: A tiny, moss-covered temple hidden in the Arashiyama forest. It's incredibly quiet and matches your vibe perfectly.\n"
        "* **Otagi Nenbutsu-ji**: Famous for its 1,200 whimsical stone statues, each with a different facial expression. It's rarely visited by tour buses!\n\n"
        "### 📖 Famous Story of That Place\n"
        "Kyoto is home to the legend of *Kitsune* (fox messengers of the god Inari). It is said that if you hike the back trails of Fushimi Inari-taisha at twilight, you might encounter a fox spirit playing tricks, guiding lost travelers back to the safety of the path.\n\n"
        "### 🎨 Culture & Traditions\n"
        "Kyoto culture revolves around *Omotenashi* (mindful hospitality). When eating, it's polite to raise small bowls to chest level instead of bending down, and always say *Itadakimasu* to show gratitude for the food prepared.\n\n"
        "### 🎉 Local Events & Meetups\n"
        "Join a weekend community cooking session in a traditional *Machiya* (wooden townhouse) to learn the art of Obanzai cooking, or visit the Toji Temple flea market if your trip overlaps with the 21st of the month to buy handmade crafts from local artisans."
    )


@router.post("/api/chat")
def chat_with_gemini(req: ChatRequest):
    gemini_key = os.getenv("GEMINI_API_KEY")
    is_first_message = len(req.messages) <= 1
    system_instruction = _build_system_instruction(req, is_first_message)

    if not gemini_key:
        return {"response": _mock_chat_response(req)}

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=gemini_key)

        # Build contents from history
        contents = []
        for idx, msg in enumerate(req.messages):
            role = "user" if msg.role == "user" else "model"
            text = msg.content
            # Override the literal first message with an explicit directive so Gemini
            # generates the plan immediately instead of treating it as an opening greeting.
            if req.destination and role == "user" and idx == len(req.messages) - 1 and is_first_message:
                text = (
                    f"Generate my full personalized destination discovery plan for {req.destination} now. "
                    "Do not ask me any questions — output the complete 4-section structured plan directly."
                )
            contents.append(types.Content(
                role=role,
                parts=[types.Part.from_text(text=text)]
            ))

        # Call Gemini API
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.6,
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=config
        )

        return {"response": response.text}

    except Exception as e:
        print(f"Gemini API failure: {e}")
        raise HTTPException(status_code=500, detail=f"Gemini generation error: {str(e)}")
