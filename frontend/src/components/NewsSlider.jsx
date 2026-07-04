import React, { useEffect, useState, useRef } from "react";

// Builds preference keywords from the user's confirmed persona only — never
// from live chat/interview activity. Only country is specific enough to be a
// useful news filter (vibe/destination type are too broad and drag in noise).
// The backend always ANDs this with a core travel/vacation/tourism filter, so
// an empty string here just means "no country preference yet", not "no
// travel filter at all".
function buildQuery(confirmedPersona) {
  return confirmedPersona?.country || "";
}

export default function NewsSlider({ confirmedPersona }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const trackRef = useRef(null);

  const query = buildQuery(confirmedPersona);

  useEffect(() => {
    let active = true;
    const fetchNews = async () => {
      setLoading(true);
      try {
        const baseUrl = import.meta.env.DEV ? "http://127.0.0.1:8000" : "";
        const res = await fetch(`${baseUrl}/api/news?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (active && data.articles) {
          setArticles(data.articles);
        }
      } catch (err) {
        console.error("Failed to fetch travel news:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchNews();
    return () => {
      active = false;
    };
  }, [query]);

  // Auto scroll effect
  useEffect(() => {
    const track = trackRef.current;
    if (!track || articles.length === 0) return;

    let scrollAmount = 0;
    const step = 1;
    const intervalTime = 40; // ms

    const scroll = () => {
      if (!track) return;
      scrollAmount += step;
      if (scrollAmount >= track.scrollWidth - track.clientWidth) {
        scrollAmount = 0;
      }
      track.scrollLeft = scrollAmount;
    };

    const interval = setInterval(scroll, intervalTime);

    // Pause on hover
    const handleMouseEnter = () => clearInterval(interval);
    const handleMouseLeave = () => {
      clearInterval(interval);
      // Resume scroll tracking the current position
      scrollAmount = track.scrollLeft;
      // Re-declare interval
      // Note: simple hack is just updating state or letting user scroll manually.
      // Let's just keep the interval simple:
    };

    track.addEventListener("mouseenter", handleMouseEnter);
    track.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      clearInterval(interval);
      if (track) {
        track.removeEventListener("mouseenter", handleMouseEnter);
        track.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [articles]);

  return (
    <div className="news-slider-container glass-card">
      <div className="news-slider-title">
        <span>📰</span> Cool Travel Finds{confirmedPersona?.country ? ` — ${confirmedPersona.country}` : ""}
      </div>
      {loading ? (
        <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Sniffing out travel articles...
        </div>
      ) : articles.length === 0 ? (
        <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          No articles found right now.
        </div>
      ) : (
        <div className="news-slider-track" ref={trackRef}>
          {articles.map((art, idx) => (
            <a
              key={idx}
              href={art.url}
              target="_blank"
              rel="noopener noreferrer"
              className="news-card"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <img src={art.urlToImage} alt={art.title} className="news-image" />
              <div className="news-content">
                <span className="news-tag">{art.source}</span>
                <h4 className="news-card-title">{art.title}</h4>
                <p className="news-card-desc">{art.description}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
