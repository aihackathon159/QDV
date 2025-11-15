import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Message, SessionData, SessionReport } from '../types';
import { generateInitialGreeting, generateAIResponseStream, textToSpeech, analyzeChildsSpeech } from '../services/geminiService';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

// Helper audio functions
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(1, frameCount, 24000); // 1 channel, 24000 sample rate
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

interface SpeechRoomProps {
  sessionData: SessionData;
  onEndSession: (report: SessionReport) => void;
}

const SpeechRoom: React.FC<SpeechRoomProps> = ({ sessionData, onEndSession }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [startTime] = useState(Date.now());
  const [psychologicalNotes, setPsychologicalNotes] = useState<string[]>([]);
  const [accuracyScores, setAccuracyScores] = useState<number[]>([]);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const modelViewerRef = useRef<any>(null);

  const audioQueueRef = useRef<string[]>([]);
  const isPlayingAudioRef = useRef(false);

  const playSoundEffect = useCallback((type: 'start' | 'stop') => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.05, audioContext.currentTime + 0.01);

    oscillator.type = 'sine';
    if (type === 'start') {
        oscillator.frequency.setValueAtTime(900, audioContext.currentTime);
    } else {
        oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
    }

    const duration = 0.1;
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);
  }, []);

  const processAudioQueue = useCallback(async () => {
    if (isPlayingAudioRef.current || audioQueueRef.current.length === 0) {
      if (!isPlayingAudioRef.current && audioQueueRef.current.length === 0) {
          setIsSpeaking(false);
      }
      return;
    }
    isPlayingAudioRef.current = true;
    setIsSpeaking(true);

    const base64Audio = audioQueueRef.current.shift();
    if (base64Audio) {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const audioContext = audioContextRef.current;
        const audioBytes = decode(base64Audio);
        const audioBuffer = await decodeAudioData(audioBytes, audioContext);
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.onended = () => {
            isPlayingAudioRef.current = false;
            processAudioQueue();
        };
        source.start();
    } else {
        isPlayingAudioRef.current = false;
        processAudioQueue();
    }
  }, []);

  const addToAudioQueue = useCallback((base64Audio: string) => {
      if (!base64Audio) return;
      audioQueueRef.current.push(base64Audio);
      processAudioQueue();
  }, [processAudioQueue]);

  const handleAIResponseStream = useCallback(async (historyForAI: { text: string; role: string }[]) => {
    setMessages(prev => [...prev, { sender: 'ai', text: '' }]);
    
    let fullAiText = '';
    let sentenceBuffer = '';
    const sentenceRegex = /([^.?!]+[.?!])\s*/g;

    try {
        const stream = generateAIResponseStream(historyForAI, sessionData.topic, sessionData.vocabulary);

        for await (const chunk of stream) {
            fullAiText += chunk;
            sentenceBuffer += chunk;
            
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if(lastMessage) {
                   lastMessage.text = fullAiText;
                }
                return newMessages;
            });

            let match;
            while ((match = sentenceRegex.exec(sentenceBuffer)) !== null) {
                const sentence = match[0].trim();
                if (sentence) {
                    textToSpeech(sentence).then(audio => addToAudioQueue(audio)).catch(console.error);
                }
            }
            if (sentenceRegex.lastIndex > 0) {
                sentenceBuffer = sentenceBuffer.slice(sentenceRegex.lastIndex);
                sentenceRegex.lastIndex = 0;
            }
        }
        
        if (sentenceBuffer.trim()) {
           const audio = await textToSpeech(sentenceBuffer.trim());
           addToAudioQueue(audio);
        }

    } catch (error) {
        console.error("Error in AI response stream:", error);
        setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if(lastMessage) {
                lastMessage.text = "Xin lỗi, mình gặp chút sự cố.";
            }
            return newMessages;
        });
    } finally {
        setIsLoading(false);
    }
  }, [sessionData, addToAudioQueue]);

  const handleNewMessage = useCallback(async (newMessage: Message, isUserMessage: boolean) => {
    setMessages(prev => [...prev, newMessage]);

    if (isUserMessage) {
        setIsLoading(true);
        const fullHistory = [...messages, newMessage];
        try {
            const analysis = await analyzeChildsSpeech(fullHistory, newMessage.text);
            
            setPsychologicalNotes(prev => [...prev, analysis.psychologicalNote]);
            setAccuracyScores(prev => [...prev, analysis.accuracy]);
            
            if (analysis.isDistressed) {
                alert("SOS: Phát hiện dấu hiệu buồn bã hoặc căng thẳng từ trẻ!");
            }

            const historyForAI = fullHistory.map(m => ({ text: m.text, role: m.sender === 'user' ? 'user' : 'model'})).filter(h => h.text);
            handleAIResponseStream(historyForAI);

        } catch (error) {
            console.error("Error handling user message:", error);
            setIsLoading(false);
        }
    } else { // For initial AI greeting
        setIsLoading(true);
        try {
            const audio = await textToSpeech(newMessage.text);
            addToAudioQueue(audio);
        } catch (error) {
            console.error("Failed to play initial greeting audio", error);
        } finally {
            setIsLoading(false);
        }
    }
  }, [messages, handleAIResponseStream, addToAudioQueue]);

  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition({
      onResult: (result: string) => {
          setSpeechError(null);
          if (result) {
              handleNewMessage({ sender: 'user', text: result }, true);
          }
      },
      onError: (error: string) => {
          if (error === 'no-speech') {
              setSpeechError("Mình không nghe thấy bạn nói. Thử lại nhé?");
          } else if (error !== 'aborted') {
              setSpeechError("Có lỗi xảy ra khi thu âm. Vui lòng thử lại.");
          }
      }
  });

  const endSession = useCallback(() => {
    const duration = Math.round((Date.now() - startTime) / 60000);
    const avgAccuracy = accuracyScores.length > 0 ? accuracyScores.reduce((a, b) => a + b, 0) / accuracyScores.length : 0;
    const engagement = "Trung bình"; // Placeholder
    
    const report: SessionReport = {
        id: new Date().toISOString(),
        date: new Date().toLocaleDateString('vi-VN'),
        duration,
        conversation: messages,
        psychologicalNotes,
        accuracy: avgAccuracy,
        engagement,
        topic: sessionData.topic,
        summary: '' // Summary will be generated in App.tsx
    };
    onEndSession(report);
  }, [startTime, accuracyScores, messages, psychologicalNotes, sessionData.topic, onEndSession]);

  useEffect(() => {
    const init = async () => {
        setIsLoading(true);
        const greeting = await generateInitialGreeting(sessionData.topic, sessionData.vocabulary);
        handleNewMessage({ sender: 'ai', text: greeting }, false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData]);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, transcript]);
  
  useEffect(() => {
    if (modelViewerRef.current) {
        modelViewerRef.current.animationName = isSpeaking ? 'Wave' : 'Idle';
    }
  }, [isSpeaking]);
  
  const handleMicToggle = () => {
    setSpeechError(null);
    if (isListening) {
      playSoundEffect('stop');
      stopListening();
    } else {
      playSoundEffect('start');
      startListening();
    }
  };
  
  const handleTextSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (textInput.trim() && !isLoading && !isListening) {
          handleNewMessage({ sender: 'user', text: textInput.trim() }, true);
          setTextInput('');
      }
  };

  return (
    <div className="flex h-screen w-screen font-sans bg-gradient-to-br from-pink-50 via-rose-50 to-rose-100 overflow-hidden">
      {/* Left side: Avatar and Controls */}
      <div className="w-2/3 flex flex-col items-center justify-center p-8 relative">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-20 -left-20 w-96 h-96 bg-white/50 rounded-full filter blur-3xl opacity-70 animate-blob"></div>
          <div className="absolute bottom-20 -right-20 w-96 h-96 bg-white/50 rounded-full filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="flex-grow flex items-center justify-center z-10 w-full h-full">
           <model-viewer
                ref={modelViewerRef}
                src="https://modelviewer.dev/shared-assets/models/RobotExpressive.glb"
                alt="AI Assistant"
                camera-controls
                disable-zoom
                camera-orbit="0deg 75deg 105%"
                shadow-intensity="1"
                autoplay
                style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
            ></model-viewer>
        </div>

        <div className="absolute bottom-12 flex items-center justify-center gap-4 bg-white/60 backdrop-blur-sm p-3 rounded-full shadow-xl z-20">
          <button 
            onClick={handleMicToggle} 
            disabled={isLoading}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all transform hover:scale-110 ${isListening ? 'bg-red-500' : 'bg-green-500'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={isListening ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
          >
            {isListening ? 
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5z"></path></svg> :
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zM10 15a4 4 0 004-4h1a5 5 0 01-10 0h1a4 4 0 004 4z"></path></svg>
            }
          </button>
          <button
            onClick={endSession}
            className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform transform hover:scale-110"
            aria-label="Kết thúc phiên"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3A.5.5 0 018 7zm2 4a.5.5 0 00-.5.5v1a.5.5 0 001 0v-1a.5.5 0 00-.5-.5z" clipRule="evenodd"></path></svg>
          </button>
        </div>
      </div>

      {/* Right side: Chat */}
      <div className="w-1/3 bg-white/90 backdrop-blur-sm border-l border-gray-200 flex flex-col shadow-2xl">
        <h2 className="p-4 text-xl font-bold text-gray-800 border-b border-gray-200 text-center">Chat</h2>
        <div className="flex-grow p-4 overflow-y-auto space-y-5">
          {messages.map((msg, index) => (
            <div key={index} className="flex flex-col">
              <p className={`font-bold text-sm ${msg.sender === 'ai' ? 'text-blue-600' : 'text-green-600'}`}>{msg.sender === 'ai' ? 'AI' : 'Bạn'}</p>
              <div className={`p-3 rounded-lg max-w-full mt-1 ${msg.sender === 'ai' ? 'bg-blue-50' : 'bg-green-50'}`}>
                <p className="text-gray-800 leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
          {transcript && (
            <div className="flex flex-col text-gray-500 italic">
              <p className="font-bold text-sm text-green-600">Bạn đang nói...</p>
              <div className="p-3 rounded-lg bg-gray-100 mt-1">
                <p>{transcript}...</p>
              </div>
            </div>
          )}
          {speechError && !isListening && (
            <div className="text-center text-orange-700 p-2 bg-orange-100 rounded-lg animate-fade-in">
              <p>{speechError}</p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="p-4 border-t border-gray-200 bg-white">
          <form onSubmit={handleTextSubmit} className="flex gap-2">
            <input 
              type="text" 
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="flex-grow border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
              disabled={isLoading || isListening}
            />
            <button 
              type="submit" 
              className="bg-gray-800 text-white px-5 py-2 rounded-full font-semibold hover:bg-gray-900 transition-colors disabled:bg-gray-400" 
              disabled={isLoading || isListening || !textInput.trim()}
            >
              Gửi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SpeechRoom;