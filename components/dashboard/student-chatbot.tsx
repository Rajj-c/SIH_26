"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Send, X, RotateCcw, Loader2 } from "lucide-react";
import styles from "./student-chatbot.module.css";

type Message = { role: "user" | "assistant"; text: string };
const welcome: Message = { role: "assistant", text: "Hi! I’m your student assistant. Ask me about courses, study plans, assessments, campus events, internships, or finding your way around the portal." };

export function StudentChatbot() {
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (open) {
      input.current?.focus();
      bottom.current?.scrollIntoView({ block: "nearest" });
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      bottom.current?.scrollIntoView({ block: "nearest" });
    }
  }, [messages, busy, open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        launcher.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function show() {
    setOpen(true);
  }

  function close() {
    setOpen(false);
    launcher.current?.focus();
  }

  async function send(text = draft) {
    if (!text.trim() || busy || request.current) return;
    const outgoing: Message = { role: "user", text: text.trim() };
    const history = messages.slice(1).slice(-8);
    setMessages((items) => [...items, outgoing]); setDraft(""); setBusy(true); setError("");
    const controller = new AbortController(); request.current = controller;
    try {
      const response = await fetch("/api/ai/student-chat", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ message: outgoing.text, history }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to send your message.");
      if (typeof data.text !== "string") throw new Error("Please try again shortly.");
      setMessages((items) => [...items, { role: "assistant", text: data.text }]);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Connection interrupted. Please try again.");
      setDraft(outgoing.text);
      setMessages((items) => items.slice(0, -1));
    } finally { request.current = null; setBusy(false); }
  }

  return (
    <>
      <button
        ref={launcher}
        type="button"
        className={styles.launcher}
        aria-label="Open student assistant"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            close();
          } else {
            show();
          }
        }}
      >
        <Image src="/student-chatbot.png" alt="Student assistant icon" width={35} height={44} priority />
      </button>

      {open && (
        <div
          role="dialog"
          aria-labelledby="student-chat-title"
          aria-modal="false"
          className={styles.panel}
        >
          <header className={styles.header}>
            <div>
              <strong id="student-chat-title">Student assistant</strong>
              <p>Learning • Campus • Careers</p>
            </div>
            <button
              type="button"
              aria-label="Start a new chat"
              disabled={busy}
              onClick={() => {
                setMessages([welcome]);
                setError("");
                setDraft("");
                input.current?.focus();
              }}
            >
              <RotateCcw size={18} />
            </button>
            <button type="button" aria-label="Close student assistant" onClick={close}>
              <X size={21} />
            </button>
          </header>

          <div className={styles.messages} role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text">
            {messages.map((message, index) => (
              <div key={index} className={message.role === "user" ? styles.user : styles.assistant}>
                <span className={styles.speaker}>{message.role === "user" ? "You" : "Assistant"}</span>
                <p>{message.text}</p>
              </div>
            ))}
            {busy && (
              <p role="status" className={styles.thinking}>
                <Loader2 size={16} /> Thinking…
              </p>
            )}
            <div ref={bottom} />
          </div>

          {messages.length === 1 && (
            <div className={styles.suggestions}>
              {["Help me plan my learning", "Where can I find campus events?"].map((text) => (
                <button key={text} type="button" disabled={busy} onClick={() => send(text)}>
                  {text}
                </button>
              ))}
            </div>
          )}

          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            {error && <p role="alert" className={styles.error}>{error}</p>}
            <label htmlFor="student-chat-message" className={styles.label}>
              Ask a student-related question
            </label>
            <div className={styles.composer}>
              <textarea
                ref={input}
                id="student-chat-message"
                rows={2}
                maxLength={1500}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="How can I build my skills?"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <button type="submit" aria-label="Send message" disabled={busy || !draft.trim()}>
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
