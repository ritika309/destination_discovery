import os
import sys

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

load_dotenv()

# Vercel's Python runtime imports this file without adding its own directory
# to sys.path, so the sibling `routers` package wouldn't otherwise be found.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from routers import chat, destinations, interview, news  # noqa: E402

app = FastAPI(title="Destination Discovery API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For hackathon/development simplicity
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(news.router)
app.include_router(destinations.router)
app.include_router(interview.router)
app.include_router(chat.router)

# Mount static files folder from React build.
# We serve it if the static folder exists (e.g. after building).
static_path = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_path):
    app.mount("/", StaticFiles(directory=static_path, html=True), name="static")
else:
    @app.get("/")
    def read_root():
        return {"message": "FastAPI is running! Mount a build of the frontend at backend/static for production serving."}
