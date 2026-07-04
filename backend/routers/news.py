import os
from typing import Optional

import requests
from fastapi import APIRouter

router = APIRouter()

DEFAULT_IMAGE = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&auto=format&fit=crop&q=60"

# Every search must match at least one of these, so results are actually about
# travel/trips/vacations rather than just happening to contain the word "travel".
TRAVEL_TERMS = "(travel OR vacation OR tourism)"


def _build_search_query(raw_query: Optional[str]) -> str:
    preference_terms = (raw_query or "").strip()
    if not preference_terms:
        return TRAVEL_TERMS
    keywords = [word for word in preference_terms.split() if word]
    preference_group = "(" + " OR ".join(keywords) + ")"
    return f"{TRAVEL_TERMS} AND {preference_group}"


@router.get("/api/news")
def get_travel_news(q: Optional[str] = None):
    news_key = os.getenv("NEWS_API_KEY")
    search_query = _build_search_query(q)

    articles = []

    if news_key:
        try:
            # 1. Try NewsAPI.org
            url = (
                f"https://newsapi.org/v2/everything?q={requests.utils.quote(search_query)}"
                f"&sortBy=relevancy&pageSize=10&apiKey={news_key}"
            )
            res = requests.get(url, timeout=5)
            data = res.json()

            if data.get("status") == "ok" and data.get("articles"):
                for art in data["articles"]:
                    if art.get("title") and art.get("title") != "[Removed]":
                        articles.append({
                            "title": art.get("title"),
                            "description": art.get("description") or "Click to read more details about this travel destination.",
                            "url": art.get("url"),
                            "urlToImage": art.get("urlToImage") or DEFAULT_IMAGE,
                            "source": art.get("source", {}).get("name", "Travel News")
                        })

            # 2. If NewsAPI was empty/unauthorized, try GNews API structure
            if not articles:
                url_gnews = (
                    f"https://gnews.io/api/v4/search?q={requests.utils.quote(search_query)}"
                    f"&lang=en&max=10&apikey={news_key}"
                )
                res_g = requests.get(url_gnews, timeout=5)
                data_g = res_g.json()
                if data_g.get("articles"):
                    for art in data_g["articles"]:
                        articles.append({
                            "title": art.get("title"),
                            "description": art.get("description") or "Click to read more details about this travel destination.",
                            "url": art.get("url"),
                            "urlToImage": art.get("image") or DEFAULT_IMAGE,
                            "source": art.get("source", {}).get("name", "GNews")
                        })
        except Exception as e:
            print(f"Error querying live News API: {e}")

    return {"articles": articles[:10]}
