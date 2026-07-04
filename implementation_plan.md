# Hackathon Travel Discovery App - Implementation Plan

We will build a highly interactive application for travelers to discover destinations, uncover hidden gems, hear local stories, and connect with culture. It uses a FastAPI backend (Python) and a React frontend (Vite), styled with Vanilla CSS for a premium, cute aesthetic.

## User Review Required

> [!IMPORTANT]
> **API Keys Required in Environment (.env)**:
> 1. `GEMINI_API_KEY`: Required for Gemini travel chatbot.
> 2. `NEWS_API_KEY`: Required for fetching travel articles via NewsAPI or GNews. (We will default to a fallback list of beautiful travel articles if no key is configured, so local development works instantly).

> [!IMPORTANT]
> **Post-Chat Recommendation Sections**:
> Once the chatbot gets the traveler's selections, the final response MUST structure and separate the output into these four sections:
> 1. 💎 **Uncovering Hidden Gems**: Off-the-beaten-path locations and secrets.
> 2. 📖 **Famous Story of That Place**: Fascinating history, myths, or historical tales.
> 3. 🎨 **Culture & Traditions**: Local custom insights, etiquette, and daily life.
> 4. 🎉 **Local Events & Meetups**: Specific ideas for connecting with locals and other visitors.

---

## Phase-wise Implementation Plan

We will divide the remaining work into the following phases to ensure systematic development and testing:

### Phase 1: Chatbot Output Parsing & Structured Rendering
* **Objective**: Refine `Chatbot.jsx` to parse the structured Gemini responses containing the 4 required sections and render them as beautiful, distinct visual cards in the UI instead of plain text markdown.
* **Tasks**:
  1. Add a `parseTravelPlan(text)` utility in `Chatbot.jsx` that splits the LLM output into an introduction and individual sections (Hidden Gems, Story, Culture, Local Events).
  2. Update the chat bubble render method to detect plans and render them in a custom dashboard card grid (`.travel-plan-cards`).
  3. Style `.travel-plan-card` in `index.css` with glassmorphic cards, custom borders, cute hover scales, and clean lists.

### Phase 2: Verification of Chatbot flow in browser
* **Objective**: Test the questionnaire flow step-by-step to verify the Gemini response is generated and parsed successfully.
* **Tasks**:
  1. Open the browser and complete the questionnaire.
  2. Verify that the response containing the 4 headers is parsed into 4 beautiful interactive cards.

### Phase 3: News API Clicks & Key Integration
* **Objective**: Resolve issues where clicking a news card does not navigate to the article.
* **Tasks**:
  1. Verify the link behavior of news cards in `NewsSlider.jsx`. Check if pointer-events or auto-scroll drag behavior blocks standard clicking.
  2. Confirm that clicking a card successfully opens the article's live URL in a new browser tab.
  3. Verify that GNews / NewsAPI live results are queried successfully when the `NEWS_API_KEY` is present.

### Phase 4: Production Build & Walkthrough
* **Objective**: Re-compile and build the React app, serve it via FastAPI, and perform a final validation.
* **Tasks**:
  1. Run `npm run build` in the frontend.
  2. Launch FastAPI uvicorn server.
  3. Take screenshots/video to document completion.

---

## Deployment Plan

For a 2-hour hackathon, the most reliable and fastest deployment strategy is to compile the frontend and host it directly from the FastAPI backend as a single service.

### Single-Service Architecture
1. **Build Frontend**: Compile Vite/React using `npm run build`, outputting static files to `frontend/dist`.
2. **Serve from FastAPI**: Mount `frontend/dist` in FastAPI using `StaticFiles` at `/` (serving index.html for all client-side routes, and hosting `/api/*` for backend services).
3. **Benefits**:
   - Only **one service** needs to be deployed (on **Render**, **Railway**, or **PythonAnywhere**).
   - No CORS (Cross-Origin Resource Sharing) setup or domain matching required, as both backend and frontend share the same origin.
   - Extremely fast setup using Git repository linking.

---

## Proposed Changes

We will split the workspace into two directories: `backend` and `frontend`.

```
destination_discovery/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── static/           # React build output copied here during deployment
│   └── .env
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── NewsSlider.jsx
    │   │   ├── PersonaSidebar.jsx
    │   │   └── Chatbot.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── package.json
    └── vite.config.js
```

### Backend (Python / FastAPI)

#### [MODIFY] [requirements.txt](file:///c:/projects/destination_delivery/destination_discovery/backend/requirements.txt)
Specifies python packages: `fastapi`, `uvicorn`, `google-genai`, `requests`, `python-dotenv`, `pydantic`.

#### [MODIFY] [main.py](file:///c:/projects/destination_delivery/destination_discovery/backend/main.py)
Implements endpoints:
- `POST /api/chat`: Accepts messages, user persona, and current selections (food, season, weather, time, duration). Calls Gemini API. The system prompt instructs Gemini to guide the user and eventually output the structured recommendation containing the 4 required sections (Hidden Gems, Story, Culture, Local Events).
- `GET /api/news`: Fetches live travel headlines from GNews/NewsAPI using keywords derived from the user's vibe and preference parameters. Falls back to static articles if keys are missing.
- `StaticFiles`: Mounted to serve `static/` folder (frontend assets) for root requests.

---

### Frontend (React / Vite)

#### [NEW] [NewsSlider.jsx](file:///c:/projects/destination_delivery/destination_discovery/frontend/src/components/NewsSlider.jsx)
A horizontal scrolling banner displaying travel news cards. Fetches new articles from `/api/news` whenever the user's vibe keywords change.

#### [NEW] [PersonaSidebar.jsx](file:///c:/projects/destination_delivery/destination_discovery/frontend/src/components/PersonaSidebar.jsx)
A sidebar where users configure their general travel persona:
- **Vibe** (Adventurous, Cultural Explorer, Chill Out, Cozy Cozy, Foodie)
- **Favorite Destination Type** (Beaches, Mountains, Bustling Cities, Historic Towns)
Uses emojis, rounded cards, and smooth active-state transitions.

#### [NEW] [Chatbot.jsx](file:///c:/projects/destination_delivery/destination_discovery/frontend/src/components/Chatbot.jsx)
The main interactive chatbot UI:
- Inline select buttons for quick context setting (Food preferences, Season, Weather, Time, Duration).
- Markdown rendering for Gemini's responses.
- Styles the generated structured sections (Gems, Story, Culture, Events) with beautiful visual blocks or accordions to make them stand out.
- Soft message bubbles, typing indicators, and user-friendly quick suggestions.

#### [NEW] [App.jsx](file:///c:/projects/destination_delivery/destination_discovery/frontend/src/App.jsx)
Connects the persona state to the chatbot and structures the page layout (News slider on top, side-by-side main content).

#### [NEW] [index.css](file:///c:/projects/destination_delivery/destination_discovery/frontend/src/index.css)
Implements the visual design system:
- Font import (e.g. Nunito / Quicksand for a friendly, cutesy feel).
- Soft pastel gradient background (`linear-gradient(135deg, #FFF0F5, #E6E6FA, #E0F7FA)`).
- Glassmorphic card styling (soft shadows, light borders, subtle backdrops).
- Cute button and scrollbar customization.

---

## Verification Plan

### Automated Tests
- Simple python test script for API verification.

### Manual Verification
1. Start FastAPI backend on `http://127.0.0.1:8000`. Test `/api/news` via browser.
2. Start Vite development server on `http://localhost:5173`.
3. Open the UI, adjust the sidebar persona, and verify that changes are saved.
4. Interact with the news slider to confirm scrolling works.
5. Message the chatbot, select quick preference pills (e.g. "Sunny", "1 Week"), and verify recommendations are highly personalized and contain stories, local culture, and hidden gems.
