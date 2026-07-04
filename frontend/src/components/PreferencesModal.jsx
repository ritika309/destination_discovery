import React from "react";

const VIBES = [
  { name: "Adventurous", emoji: "🧗‍♀️", label: "Adventurous" },
  { name: "Cultural Explorer", emoji: "🏯", label: "Cultural" },
  { name: "Chill Out", emoji: "🏖️", label: "Chill Out" },
  { name: "Cozy Cozy", emoji: "🏡", label: "Cozy Cozy" },
  { name: "Foodie", emoji: "🍰", label: "Foodie" }
];

const DEST_TYPES = [
  { name: "Beaches", emoji: "🌊", label: "Beaches" },
  { name: "Mountains", emoji: "🏔️", label: "Mountains" },
  { name: "Bustling Cities", emoji: "🌆", label: "Cities" },
  { name: "Historic Towns", emoji: "🏛️", label: "Historic" }
];

export default function PreferencesModal({ persona, setPersona, onClose }) {
  const updateVibe = (vibe) => setPersona((prev) => ({ ...prev, vibe }));
  const updateDest = (destination_type) => setPersona((prev) => ({ ...prev, destination_type }));
  const updateCountry = (e) => setPersona((prev) => ({ ...prev, country: e.target.value }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="sidebar-title">
            <span>🎒</span> My Travel Profile
          </h2>
          <button type="button" className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 10px 0", lineHeight: "1.4" }}>
          Set your general profile. Aura uses this to shape all your recommendations!
        </p>

        <div className="section-group">
          <label className="section-label">✨ Choose your vibe</label>
          <div className="grid-select">
            {VIBES.map((item) => (
              <button
                key={item.name}
                type="button"
                className={`option-btn ${persona.vibe === item.name ? "active" : ""}`}
                onClick={() => updateVibe(item.name)}
              >
                <span className="option-btn-emoji">{item.emoji}</span>
                <span className="option-btn-text">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--card-border)", margin: "14px 0" }} />

        <div className="section-group">
          <label className="section-label">🗺️ Destination style</label>
          <div className="grid-select">
            {DEST_TYPES.map((item) => (
              <button
                key={item.name}
                type="button"
                className={`option-btn ${persona.destination_type === item.name ? "active" : ""}`}
                onClick={() => updateDest(item.name)}
              >
                <span className="option-btn-emoji">{item.emoji}</span>
                <span className="option-btn-text">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--card-border)", margin: "14px 0" }} />

        <div className="section-group">
          <label className="section-label">🌍 Country preference (optional)</label>
          <input
            type="text"
            className="chat-input"
            placeholder="e.g. Japan, Italy... or leave blank for anywhere"
            value={persona.country}
            onChange={updateCountry}
          />
        </div>

        <button type="button" className="modal-done-btn" onClick={onClose}>Done ✓</button>
      </div>
    </div>
  );
}
