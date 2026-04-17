import { useState } from "react";

function ChatbotWidget({
  ariaLabel,
  panelTitle,
  initialAssistantMessage,
  inputPlaceholder,
  toggleClassName,
  panelClassName,
  headerClassName,
  messagesClassName,
  bubbleClassName,
  statusClassName,
  errorClassName,
  inputRowClassName,
  inputClassName,
  sendButtonClassName,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content: initialAssistantMessage,
    },
  ]);

  const handleSendChat = async () => {
    const message = chatInput.trim();
    if (!message || chatLoading) {
      return;
    }

    const userEntry = { role: "user", content: message };
    const nextMessages = [...chatMessages, userEntry];

    setChatMessages(nextMessages);
    setChatInput("");
    setChatError(null);
    setChatLoading(true);

    try {
      const history = nextMessages.map((entry) => ({
        role: entry.role,
        content: entry.content,
      }));

      const response = await fetch("http://localhost:5000/api/chatbot/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Chat API returned non-JSON response. Is the server running?");
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to get chatbot response");
      }

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.answer || "I could not generate a response.",
        },
      ]);
    } catch (err) {
      setChatError(err.message);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I am having trouble connecting to the chatbot service right now.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={toggleClassName}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open chatbot"
      >
        AI
      </button>

      {isOpen && (
        <section className={panelClassName} aria-label={ariaLabel}>
          <div className={headerClassName}>
            <h3>{panelTitle}</h3>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close chatbot">
              x
            </button>
          </div>

          <div className={messagesClassName}>
            {chatMessages.map((entry, index) => (
              <article key={`${entry.role}-${index}`} className={`${bubbleClassName} ${entry.role}`}>
                {entry.content}
              </article>
            ))}
            {chatLoading && <p className={statusClassName}>Thinking...</p>}
          </div>

          {chatError && <p className={errorClassName}>{chatError}</p>}

          <div className={inputRowClassName}>
            <input
              type="text"
              className={inputClassName}
              placeholder={inputPlaceholder}
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSendChat();
                }
              }}
            />
            <button
              type="button"
              className={sendButtonClassName}
              onClick={handleSendChat}
              disabled={chatLoading}
            >
              Send
            </button>
          </div>
        </section>
      )}
    </>
  );
}

export default ChatbotWidget;