"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { GREETING, sendChat, type ChatMessage } from "@/lib/chat";
import type { NdaData } from "@/lib/nda";

interface NdaChatProps {
  data: NdaData;
  onChange: (data: NdaData) => void;
}

type ChatStatus = "idle" | "sending" | "failed";

/** Freeform chat with the drafting assistant, which fills in the NDA fields as it goes. */
export default function NdaChat({ data, onChange }: NdaChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: GREETING }]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, status]);

  async function send() {
    const text = draft.trim();
    if (!text || status === "sending") return;

    const conversation: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(conversation);
    setDraft("");
    setStatus("sending");
    try {
      const { reply, data: updated } = await sendChat(conversation, data);
      setMessages([...conversation, { role: "assistant", content: reply }]);
      onChange(updated);
      setStatus("idle");
    } catch (error) {
      console.error(error);
      setMessages(messages);
      setDraft(text);
      setStatus("failed");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  return (
    <div className="flex h-full min-h-[28rem] flex-col lg:min-h-0">
      <div ref={logRef} role="log" aria-label="Conversation" className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.map((message, index) => (
          <Bubble key={index} message={message} />
        ))}
      </div>

      <p role="status" className="min-h-6 text-sm text-muted">
        {status === "sending" && "Thinking…"}
        {status === "failed" && "The assistant couldn’t reply. Try sending again."}
      </p>

      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-rule pt-3">
        <textarea
          rows={2}
          aria-label="Message"
          placeholder="Type your answer…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 resize-none rounded-[3px] border border-rule bg-paper px-3 py-2 text-[0.9375rem] text-type placeholder:text-muted focus:border-ink"
        />
        <button
          type="submit"
          disabled={status === "sending" || !draft.trim()}
          className="rounded-[3px] bg-brand-purple px-4 py-2 text-sm font-semibold text-paper hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const fromUser = message.role === "user";
  return (
    <div className={fromUser ? "flex justify-end" : "flex justify-start"}>
      <p
        className={`max-w-[85%] whitespace-pre-wrap rounded-md px-3 py-2 text-[0.9375rem] leading-relaxed ${
          fromUser ? "bg-ink text-paper" : "border border-rule bg-desk/40 text-type"
        }`}
      >
        <span className="sr-only">{fromUser ? "You: " : "Assistant: "}</span>
        {message.content}
      </p>
    </div>
  );
}
