"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  sender: "User" | "Assistant";
  text: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [sessionId, setSessionId] = useState<string>("");

  // Initialize or retrieve session ID from localStorage
  useEffect(() => {
    const existingId = localStorage.getItem("session_id");
    if (existingId) {
      setSessionId(existingId);
    } else {
      const newId = crypto.randomUUID(); // Or you can use `Date.now().toString()`
      localStorage.setItem("session_id", newId);
      setSessionId(newId);
    }
  }, []);

  const askTheAI = async () => {
    const userInput = textareaRef.current?.value.trim();
    if (!userInput || loading || !sessionId) return;

    if (textareaRef.current) textareaRef.current.value = "";
    setMessages((prev) => [...prev, { sender: "User", text: userInput }]);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userInput,
          session_id: sessionId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.answer) {
        throw new Error("Invalid response from server");
      }

      setMessages((prev) => [
        ...prev,
        { sender: "Assistant", text: data.answer },
      ]);
    } catch (error) {
      console.log(error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "Assistant",
          text: "⚠️ Failed to get a response. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 bg-gray-100">
      <div className="w-full max-w-2xl space-y-4">
        {/* Conversation History */}
        <div className="bg-white p-4 rounded-xl shadow-md h-64 overflow-y-auto">
          <div className="space-y-2">
            {messages.map((msg, index) => (
              <div key={index} className="text-left">
                <p className="text-sm text-gray-500">{msg.sender}:</p>
                <p className="text-base">{msg.text}</p>
              </div>
            ))}
            {loading && (
              <div className="text-left text-blue-500 italic">
                Assistant is typing...
              </div>
            )}
            {messages.length === 0 && !loading && (
              <p className="text-gray-400 text-center">No messages yet</p>
            )}
          </div>
        </div>

        {/* Textarea Input */}
        <textarea
          ref={textareaRef}
          className="w-full h-40 p-4 border border-gray-300 rounded-xl resize-none shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type your message here..."
          disabled={loading}
        ></textarea>

        {/* Submit Button */}
        <button
          onClick={askTheAI}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:bg-blue-300 transition duration-200"
        >
          {loading ? "Waiting..." : "Ask the AI"}
        </button>
      </div>
    </div>
  );
}
