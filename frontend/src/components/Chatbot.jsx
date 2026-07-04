import React, { useState, useEffect, useRef } from "react";
import PreferencesModal from "./PreferencesModal";

const GREETING = "Hi there! I'm Aura, your local travel companion! 🎒✨ Tell me a bit about your dream trip and I'll take it from there!";

export default function Chatbot({ persona, setPersona, selections, setSelections, chosenDestination, setChosenDestination, onPreferencesConfirmed }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [readyForDestinations, setReadyForDestinations] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const messagesEndRef = useRef(null);

  // Greet, and prompt for preferences first — the AI's first real question only
  // fires once preferences are set (or the user starts typing anyway).
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        { role: "model", content: GREETING },
        {
          role: "model",
          content: "First, let's set your travel preferences so I can tailor everything to you! 🎒",
          isPreferencesPrompt: true
        }
      ]);
    }
  }, []);

  // Fires the AI's opening interview question, but only once, whichever comes
  // first: the user finishes the preferences form, or starts typing anyway.
  const startInterviewIfNeeded = () => {
    if (!interviewStarted) {
      setInterviewStarted(true);
      continueInterview(messages);
    }
  };

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Ask Gemini to carry the conversation forward: react to what was said, ask the
  // next natural question, and tell us once it has learned enough to move on.
  const continueInterview = async (history) => {
    setLoading(true);
    try {
      const baseUrl = import.meta.env.DEV ? "http://127.0.0.1:8000" : "";
      const res = await fetch(`${baseUrl}/api/interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona,
          messages: history.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();

      const mergedSelections = { ...selections };
      if (data.preferences) {
        Object.entries(data.preferences).forEach(([key, value]) => {
          if (value) mergedSelections[key] = value;
        });
      }
      setSelections(mergedSelections);

      const newHistory = [...history, { role: "model", content: data.reply }];
      setMessages(newHistory);

      if (data.done) {
        setReadyForDestinations(true);
        if (data.directDestination) {
          handleDestinationSelect({ name: data.directDestination, country: "" }, newHistory);
        } else {
          fetchDestinationOptions(mergedSelections);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: "model", content: "Oops! 🥺 I had trouble thinking of my next question. Please check if the backend is running!" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDestinationOptions = async (activeSelections) => {
    setLoading(true);
    try {
      const baseUrl = import.meta.env.DEV ? "http://127.0.0.1:8000" : "";
      const res = await fetch(`${baseUrl}/api/suggest-destinations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona, selections: activeSelections })
      });
      const data = await res.json();

      setMessages(prev => [
        ...prev,
        {
          role: "model",
          content: "Here are a few spots I think you'll love! Pick one to dive in, or just type your own: 🌍",
          isDestinationOptions: true,
          destinationOptions: data.destinations || []
        }
      ]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: "model", content: "Oops! 🥺 I had trouble finding destinations. Please check if the backend is running or try restarting!" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDestinationSelect = (dest, historyOverride) => {
    const destinationLabel = dest.country ? `${dest.name}, ${dest.country}` : dest.name;
    setChosenDestination(dest);
    setReadyForDestinations(true);

    const baseHistory = historyOverride || messages;
    const userMessage = { role: "user", content: `I'd like to explore ${destinationLabel}! ✨` };
    const updatedHistory = baseHistory.map(msg =>
      msg.isDestinationOptions ? { ...msg, isDestinationOptions: false } : msg
    );
    const newHistory = [...updatedHistory, userMessage];
    setMessages(newHistory);

    triggerPlanForDestination(newHistory, destinationLabel);
  };

  const triggerPlanForDestination = async (history, destinationLabel) => {
    setLoading(true);
    try {
      const baseUrl = import.meta.env.DEV ? "http://127.0.0.1:8000" : "";
      const payload = {
        messages: history.map(m => ({ role: m.role, content: m.content })),
        persona,
        selections,
        destination: destinationLabel
      };

      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      setMessages(prev => [
        ...prev,
        { role: "model", content: data.response }
      ]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: "model", content: "Oops! 🥺 I had trouble reading the stars. Please check if the backend is running or try sending a message again!" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");

    // Destination suggestions are showing -> treat typed text as the chosen destination.
    if (!chosenDestination && readyForDestinations) {
      handleDestinationSelect({ name: userText, country: "" });
      return;
    }

    // Still interviewing -> let Aura carry the conversation forward.
    if (!chosenDestination && !readyForDestinations) {
      setInterviewStarted(true);
      const newMessages = [...messages, { role: "user", content: userText }];
      setMessages(newMessages);
      continueInterview(newMessages);
      return;
    }

    // Destination already chosen -> grounded free chat.
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const baseUrl = import.meta.env.DEV ? "http://127.0.0.1:8000" : "";
      const payload = {
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        persona: persona,
        selections: selections,
        destination: chosenDestination.country ? `${chosenDestination.name}, ${chosenDestination.country}` : chosenDestination.name
      };

      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      setMessages(prev => [
        ...prev,
        { role: "model", content: data.response }
      ]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: "model", content: "Sorry! 😿 I failed to connect. Try checking your internet connection or backend setup!" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setSelections({
      food: "",
      season: "",
      weather: "",
      time: "",
      duration: ""
    });
    setReadyForDestinations(false);
    setChosenDestination(null);
    setInterviewStarted(false);
    setMessages([
      { role: "model", content: "Hi there! Let's start fresh. 🗺️✨" },
      {
        role: "model",
        content: "First, let's set your travel preferences so I can tailor everything to you! 🎒",
        isPreferencesPrompt: true
      }
    ]);
  };

  // Simple and safe HTML converter for basic markdown elements
  const renderMarkdown = (text) => {
    if (!text) return "";

    // Escape basic HTML to prevent XSS
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Bold replacement
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Headers h3 (using regex anchors)
    html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");

    // Split lines for lists and paragraph formatting
    const lines = html.split("\n");
    let inList = false;
    const processedLines = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        const content = trimmed.substring(2);
        let out = "";
        if (!inList) {
          inList = true;
          out += '<ul class="custom-list">';
        }
        out += `<li>${content}</li>`;
        return out;
      } else {
        let out = "";
        if (inList) {
          inList = false;
          out += "</ul>";
        }
        if (trimmed === "") {
          return out;
        }
        if (trimmed.startsWith("<h3")) {
          return out + trimmed;
        }
        return out + `<p>${trimmed}</p>`;
      }
    });

    if (inList) {
      processedLines.push("</ul>");
    }

    return processedLines.join("\n");
  };

  return (
    <div className="chat-container glass-card">
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-avatar">🧚‍♀️</div>
          <div>
            <h3 className="chat-title">Aura</h3>
            <span className="chat-status">
              <span className="chat-status-dot"></span> Online Travel Companion
            </span>
          </div>
        </div>
        <div className="chat-header-actions">
          <button
            type="button"
            onClick={() => setShowPreferences(true)}
            style={{
              background: "none",
              border: "none",
              color: "var(--primary-hover)",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "0.85rem"
            }}
          >
            🎒 Preferences
          </button>
          <button
            type="button"
            onClick={resetChat}
            style={{
              background: "none",
              border: "none",
              color: "var(--primary-hover)",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "0.85rem"
            }}
          >
            🔄 Restart
          </button>
        </div>
      </div>

      {showPreferences && (
        <PreferencesModal
          persona={persona}
          setPersona={setPersona}
          onClose={() => {
            setShowPreferences(false);
            onPreferencesConfirmed();
            startInterviewIfNeeded();
          }}
        />
      )}

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message-wrapper ${msg.role}`}>
            <div className="message-icon">{msg.role === "user" ? "🎒" : "🧚‍♀️"}</div>
            <div className="message-bubble">
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              {msg.isPreferencesPrompt && (
                <button
                  type="button"
                  className="preferences-prompt-btn"
                  onClick={() => setShowPreferences(true)}
                >
                  🎒 Set My Preferences
                </button>
              )}
              {msg.isDestinationOptions && (
                <div className="destination-options-grid">
                  {msg.destinationOptions.map((dest, i) => (
                    <button
                      key={i}
                      className="destination-card"
                      onClick={() => handleDestinationSelect(dest)}
                    >
                      <div className="destination-card-header">
                        <span className="destination-card-name">{dest.name}</span>
                        <span className="destination-card-country">{dest.country}</span>
                      </div>
                      <p className="destination-card-tagline">{dest.tagline}</p>
                      <p className="destination-card-reason">✨ {dest.matchReason}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message-wrapper model">
            <div className="message-icon">🧚‍♀️</div>
            <div className="message-bubble">
              <div className="typing-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSend}>
        <input
          type="text"
          className="chat-input"
          placeholder={
            chosenDestination
              ? "Ask Aura anything else about this place..."
              : readyForDestinations
              ? "Type the destination you have in mind..."
              : "Tell Aura about your dream trip..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="send-btn" disabled={!input.trim() || loading}>
          🚀
        </button>
      </form>
    </div>
  );
}
