'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Send, Zap, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { ComponentRenderer, ComponentSchema } from '@/components/generative/ComponentRenderer';
import { apiClient } from '@/lib/api-client';
import { streamReader } from '@/lib/streaming-utils';
import { dbManager } from '@/lib/indexed-db';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function ChatStreamingPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamComponents, setStreamComponents] = useState<ComponentSchema[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize IndexedDB
  useEffect(() => {
    dbManager.init().then(() => {
      dbManager.getChatHistory(10).then(setMessages);
    });
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamComponents]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setStreamComponents([]);

    // Add user message
    const newMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMessage]);
    await dbManager.saveChatMessage(newMessage);

    try {
      const stream = await apiClient.chatStreamingQuery(userMessage);
      if (!stream) throw new Error('No stream response');

      await streamReader(stream, (chunk) => {
        switch (chunk.type) {
          case 'test_result':
            setStreamComponents((prev) => {
              const updated = [...prev];
              // Avoid duplicates
              const exists = updated.some(
                (c) => c.props?.test_id === chunk.component?.props?.test_id
              );
              if (!exists) {
                updated.push(chunk.component);
              }
              return updated;
            });
            break;

          case 'complete':
            toast.success('Search complete! 🎉');
            break;

          case 'error':
            toast.error(chunk.message || 'Stream error');
            break;
        }
      });
    } catch (error) {
      console.error('Stream error:', error);
      toast.error('Failed to stream results');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="h-6 w-6" />
            <h1 className="text-2xl font-bold">AI Diagnostic Search</h1>
          </div>
          <p className="text-blue-100">Describe your patient's case and get personalized test recommendations</p>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto max-w-4xl w-full mx-auto px-4 py-6 space-y-6">
        {messages.length === 0 && streamComponents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex items-center justify-center"
          >
            <div className="text-center">
              <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Start a Diagnosis</h2>
              <p className="text-slate-600 max-w-md">
                Describe your patient's symptoms, test history, and medical background to get AI-powered test recommendations.
              </p>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Chat Messages */}
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-lg px-6 py-3 rounded-2xl shadow-md ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-none'
                      : 'bg-white text-slate-900 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}

            {/* Streaming Components */}
            {streamComponents.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200"
              >
                <ComponentRenderer
                  schema={streamComponents}
                  context={{
                    onShare: (testId) => {
                      toast.loading('Preparing share link...');
                      // Implementation in next section
                    },
                    onAction: (action, payload) => {
                      console.log(`Action: ${action}`, payload);
                      toast.success(`Action: ${action}`);
                    },
                  }}
                />
              </motion.div>
            )}

            {/* Loading Indicator */}
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 text-slate-600 bg-white rounded-2xl p-4 shadow-md border border-slate-200"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-medium">Searching and ranking tests...</span>
              </motion.div>
            )}
          </>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 px-4 py-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="E.g., 70yo male with lung mass, smoker, possible EGFR mutation..."
            className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            disabled={loading}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-lg"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {loading ? 'Searching...' : 'Send'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
