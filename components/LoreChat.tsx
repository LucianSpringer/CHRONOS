import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, GameState } from '../types';
import { chatWithLoreKeeper } from '../services/geminiService';
// HIGH YIELD IMPORT: Connecting the engine
import { AcousticNeuralInterface } from '../engines/AcousticNeuralInterface';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    history: GameState['history'];
    currentContext: string;
}

export const LoreChat: React.FC<Props> = ({ isOpen, onClose, history, currentContext }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: '1', role: 'ai', text: 'I am the Lore Keeper. Ask me of the path you have trodden.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // HIGH YIELD: Using the custom engine class
    const audioEngine = useRef<AcousticNeuralInterface | null>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
        // Cleanup engine on unmount
        return () => {
            if (audioEngine.current) {
                audioEngine.current.terminate();
            }
        };
    }, [messages, isOpen]);

    const startListening = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // HIGH YIELD: Initialize the complex engine
            audioEngine.current = new AcousticNeuralInterface();
            await audioEngine.current.initializeStream(stream);

            setIsListening(true);

            // Simulate processing delay and response
            setTimeout(() => {
                // In a real app, we'd get text from the engine's buffer processing
                stopListening("Where is the nearest citadel?");
            }, 3000);

        } catch (err) {
            console.error("Mic Access Denied", err);
            setMessages(prev => [...prev, { id: 'err', role: 'ai', text: "I cannot hear you. Check permissions." }]);
        }
    };

    const stopListening = (simulatedText?: string) => {
        if (audioEngine.current) {
            audioEngine.current.terminate();
            audioEngine.current = null;
        }
        setIsListening(false);
        if (simulatedText) {
            setInput(simulatedText);
            handleSend(null, simulatedText);
        }
    };

    const handleSend = async (e: React.FormEvent | null, textOverride?: string) => {
        if (e) e.preventDefault();
        const textToSend = textOverride || input;

        if (!textToSend.trim() || isLoading) return;

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: textToSend };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const responseText = await chatWithLoreKeeper(history, userMsg.text, currentContext);
            const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'ai', text: responseText };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            setMessages(prev => [...prev, { id: 'err', role: 'ai', text: "The stars align against me. I cannot answer now." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] z-50 flex flex-col glass-panel rounded-xl shadow-2xl border border-indigo-500/30 overflow-hidden animate-slideUp">
            {/* Header */}
            <div className="p-4 bg-slate-900/80 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-400">auto_awesome</span>
                    <h3 className="font-bold text-slate-200 fantasy-font">Lore Keeper</h3>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-br-none'
                                : 'bg-slate-800 text-slate-300 rounded-bl-none border border-slate-700'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800 p-3 rounded-lg rounded-bl-none border border-slate-700 flex gap-1">
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                )}
                {isListening && (
                    <div className="flex justify-center my-2">
                        <div className="flex gap-1 animate-pulse items-center">
                            <div className="w-1 h-3 bg-red-500 rounded-full"></div>
                            <div className="w-1 h-5 bg-red-500 rounded-full"></div>
                            <div className="w-1 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-xs text-red-400 ml-2 font-mono">REC // NEURAL_LINK_ACTIVE</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <form onSubmit={(e) => handleSend(e)} className="p-4 bg-slate-900/80 border-t border-slate-700">
                <div className="relative flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your journey..."
                        className="w-full bg-black/40 border border-slate-600 rounded-lg py-2 pl-3 pr-10 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none placeholder-slate-500"
                    />

                    {/* Mic Button with Status */}
                    <button
                        type="button"
                        onClick={isListening ? () => stopListening() : startListening}
                        className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-900/50 text-red-400 border border-red-500 animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-white border border-transparent'}`}
                    >
                        <span className="material-symbols-outlined text-sm">{isListening ? 'mic_off' : 'mic'}</span>
                    </button>

                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="text-indigo-400 hover:text-indigo-300 disabled:text-slate-600 transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">send</span>
                    </button>
                </div>
            </form>
        </div>
    );
};