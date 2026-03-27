import { FormEvent, useState } from "react";
import {
  fallbackSupportReply,
  supportQuickActions,
  supportTopics,
} from "../../data/supportKnowledge";
import { useAutoScrollToBottom } from "../../hooks/useAutoScrollToBottom";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  suggestions?: string[];
}

function createMessage(
  role: ChatMessage["role"],
  text: string,
  suggestions?: string[],
): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    role,
    text,
    suggestions,
  };
}

function getSupportReply(input: string) {
  const normalized = input.trim().toLowerCase();
  let bestTopic = fallbackSupportReply;
  let bestScore = 0;

  supportTopics.forEach((topic) => {
    const score = topic.keywords.reduce((total, keyword) => {
      return normalized.includes(keyword) ? total + 1 : total;
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  });

  return bestScore > 0 ? bestTopic : fallbackSupportReply;
}

const initialAssistantMessage = createMessage(
  "assistant",
  "Hi, I am the Bell Fresh support assistant. Ask me about the menu, login, cart, checkout, receipts, or milk tea customization.",
  supportQuickActions,
);

export function SupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialAssistantMessage]);
  const bottomRef = useAutoScrollToBottom(`${isOpen}-${messages.length}-${isTyping}`);

  const sendMessage = (rawText: string) => {
    const text = rawText.trim();
    if (!text) {
      return;
    }

    const userMessage = createMessage("user", text);
    const reply = getSupportReply(text);

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setInput("");
    setIsTyping(true);

    window.setTimeout(() => {
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage("assistant", reply.answer, reply.suggestions),
      ]);
      setIsTyping(false);
    }, 420);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="chatbot-root">
      {isOpen ? (
        <section className="chatbot-window" aria-label="Bell Fresh support assistant">
          <div className="chatbot-header">
            <div>
              <p className="eyebrow">Website support</p>
              <h2>BellBot</h2>
            </div>
            <button
              type="button"
              className="ghost-button chatbot-close"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "assistant"
                    ? "chatbot-message chatbot-message--assistant"
                    : "chatbot-message chatbot-message--user"
                }
              >
                <p>{message.text}</p>
                {message.suggestions?.length ? (
                  <div className="chatbot-suggestions">
                    {message.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="chatbot-chip"
                        onClick={() => sendMessage(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {isTyping ? <p className="chatbot-status">BellBot is typing...</p> : null}
            <div ref={bottomRef} aria-hidden="true" />
          </div>

          <form className="chatbot-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a Bell Fresh question"
            />
            <button type="submit" className="cta-link chatbot-send">
              Send
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className="chatbot-toggle"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        {isOpen ? "Hide support" : "Ask BellBot"}
      </button>
    </div>
  );
}
