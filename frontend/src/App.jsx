import React, { useState } from "react";
import NewsSlider from "./components/NewsSlider";
import Chatbot from "./components/Chatbot";

export default function App() {
  const [persona, setPersona] = useState({
    vibe: "Adventurous",
    destination_type: "Mountains",
    country: ""
  });

  const [selections, setSelections] = useState({
    food: "",
    season: "",
    weather: "",
    time: "",
    duration: ""
  });

  const [chosenDestination, setChosenDestination] = useState(null);

  // Snapshot of persona taken only when the user finishes the preferences form.
  // News only refreshes off this snapshot, never off live chat/interview activity.
  const [confirmedPersona, setConfirmedPersona] = useState(null);

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header glass-card">
        <div className="logo-container">
          <span className="logo-icon">🗺️</span>
          <h1 className="logo-title">Aura Discoveries</h1>
        </div>
        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600" }}>
          Your Local Culture Guide ✨
        </div>
      </header>

      {/* Dynamic News Slider */}
      <NewsSlider confirmedPersona={confirmedPersona} />

      {/* Chat layer */}
      <main className="main-content">
        <Chatbot
          persona={persona}
          setPersona={setPersona}
          selections={selections}
          setSelections={setSelections}
          chosenDestination={chosenDestination}
          setChosenDestination={setChosenDestination}
          onPreferencesConfirmed={() => setConfirmedPersona({ ...persona })}
        />
      </main>
    </div>
  );
}
