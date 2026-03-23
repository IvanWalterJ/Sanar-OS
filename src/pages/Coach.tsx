import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';

export default function Coach() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hola Dra. Marcela. Soy Sanare Coach. Conozco tu programa de 8 semanas y tu especialidad en nutrición. ¿En qué te ayudo hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll al último mensaje
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    
    const userMsg = input;
    setInput('');
    
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setIsTyping(true);
    
    try {
      // Añadir mensaje vacío del asistente que se irá llenando
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      
      // Instanciar GoogleGenAI justo antes de la llamada a la API
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const contents = newMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const streamResponse = await ai.models.generateContentStream({
        model: 'gemini-3.1-pro-preview',
        contents: contents,
        config: {
          systemInstruction: "Eres Sanare Coach, un asistente de IA exclusivo para profesionales de la salud que usan Sanare OS. Tu objetivo es ayudarlos a escalar sus clínicas digitales, crear ofertas high-ticket y mejorar sus ventas. Eres directo, profesional, estratégico y usas un tono premium. No das consejos médicos, solo de negocios y marketing digital en salud.",
        }
      });
      
      let fullResponse = '';
      for await (const chunk of streamResponse) {
        fullResponse += chunk.text;
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = fullResponse;
          return newMsgs;
        });
      }
    } catch (error) {
      console.error("Error calling Gemini:", error);
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1].content = "Hubo un error de conexión. Por favor, intenta de nuevo.";
        return newMsgs;
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col glass-panel rounded-2xl overflow-hidden animate-in fade-in duration-500">
      <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Sanare Coach</h2>
            <p className="text-xs text-blue-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Asistente IA con contexto de tu clínica
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'assistant' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/10 text-gray-300'
            }`}>
              {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-sm' 
                : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm'
            }`}>
              {msg.role === 'user' ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="text-sm leading-relaxed prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                  <Markdown>{msg.content}</Markdown>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-white/10 bg-white/5">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            placeholder={isTyping ? "El coach está escribiendo..." : "Preguntale a tu coach..."}
            className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-4 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all disabled:opacity-50"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 w-10 h-10 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 flex items-center justify-center text-white transition-colors"
          >
            <Send className="w-4 h-4 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
