import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { Message, SessionReport } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateInitialGreeting(topic: string, vocabulary: string[]): Promise<string> {
    const prompt = `Bạn là một trợ lý giọng nói thân thiện, dịu dàng và nói chuyện rõ ràng bằng giọng nữ tiếng Việt, được thiết kế để giúp đỡ trẻ em Việt Nam từ 5-12 tuổi bị chậm nói.
    Nhiệm vụ của bạn là bắt đầu một buổi nói chuyện thật tự nhiên và vui vẻ.
    Hãy làm theo các bước sau:
    1. Chào bé một cách nồng nhiệt.
    2. Tự giới thiệu mình là một người bạn robot.
    3. Hỏi tên của bé để làm quen.
    4. Sau khi bé trả lời, hãy hỏi về một sở thích đơn giản (ví dụ: 'Con thích chơi gì nhất?' hoặc 'Con thích con vật nào nhất?').
    5. Dựa vào câu trả lời của bé, hãy dẫn dắt một cách khéo léo vào chủ đề hôm nay là '${topic}' với các từ vựng: ${vocabulary.join(', ')}.

    Ví dụ: Nếu bé nói thích 'con chó', và chủ đề là 'Động vật', bạn có thể nói 'Ồ, bạn robot cũng thích chó lắm! Ngoài chó ra, trong sở thú còn có nhiều bạn động vật khác nữa đó. Con có biết không?'.

    Hãy nhớ, cuộc trò chuyện phải thật tự nhiên, không giống một bài kiểm tra. Giữ câu nói ngắn gọn và dễ hiểu. Câu trả lời của bạn phải hoàn toàn bằng tiếng Việt.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.8,
                maxOutputTokens: 150,
            }
        });
        return (response?.text ?? '').trim() || "Xin chào! Chúng ta cùng bắt đầu nhé?";
    } catch (error) {
        console.error("Error generating initial greeting:", error);
        return "Xin chào! Hôm nay em có khỏe không?";
    }
}

export async function generateAIResponse(history: { text: string; role: string }[], topic: string, vocabulary: string[]): Promise<string> {
    const systemInstruction = `Bạn là một trợ lý giọng nói thân thiện, dịu dàng và nói chuyện rõ ràng bằng giọng nữ tiếng Việt, được thiết kế để giúp đỡ trẻ em Việt Nam từ 5-12 tuổi bị chậm nói.
    Nhiệm vụ của bạn là tiếp tục cuộc trò chuyện một cách tự nhiên để giúp trẻ luyện nói.
    Chủ đề hôm nay là '${topic}' với các từ vựng sau: ${vocabulary.join(', ')}.
    Hãy lồng ghép các từ vựng vào cuộc trò chuyện một cách khéo léo, đừng dạy một cách trực tiếp.
    Hãy luôn duy trì sự kiên nhẫn và khuyến khích bé.
    Giữ cho các câu trả lời của bạn ngắn gọn, hấp dẫn và dễ hiểu cho trẻ em.
    Nếu trẻ nói điều gì đó không liên quan, hãy nhẹ nhàng hướng cuộc trò chuyện trở lại chủ đề.
    Luôn trả lời hoàn toàn bằng tiếng Việt.`;
    
    // Filter out messages with empty text to prevent API errors.
    const validHistory = history.filter(h => h.text && h.text.trim() !== '');
    if (validHistory.length === 0) {
        console.warn("generateAIResponse called with empty history. Returning default message.");
        return "Em có thể nói lại được không?";
    }
    const contents = validHistory.map(h => ({ parts: [{ text: h.text }], role: h.role === 'user' ? 'user' : 'model' }));

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.8,
            }
        });
        // Ensure the function itself doesn't return an empty string that could pollute the history.
        return (response?.text ?? '').trim() || "Mình không hiểu. Em có thể nói lại lần nữa được không?";
    } catch (error) {
        console.error("Error generating AI response:", error);
        return "Mình không nghe rõ, em có thể nói lại được không?";
    }
}

export async function* generateAIResponseStream(history: { text: string; role: string }[], topic: string, vocabulary: string[]): AsyncGenerator<string> {
    const systemInstruction = `Bạn là một trợ lý giọng nói thân thiện, dịu dàng và nói chuyện rõ ràng bằng giọng nữ tiếng Việt, được thiết kế để giúp đỡ trẻ em Việt Nam từ 5-12 tuổi bị chậm nói.
    Nhiệm vụ của bạn là tiếp tục cuộc trò chuyện một cách tự nhiên để giúp trẻ luyện nói.
    Chủ đề hôm nay là '${topic}' với các từ vựng sau: ${vocabulary.join(', ')}.
    Hãy lồng ghép các từ vựng vào cuộc trò chuyện một cách khéo léo, đừng dạy một cách trực tiếp.
    Hãy luôn duy trì sự kiên nhẫn và khuyến khích bé.
    Giữ cho các câu trả lời của bạn ngắn gọn, hấp dẫn và dễ hiểu cho trẻ em.
    Nếu trẻ nói điều gì đó không liên quan, hãy nhẹ nhàng hướng cuộc trò chuyện trở lại chủ đề.
    Luôn trả lời hoàn toàn bằng tiếng Việt.`;
    
    const validHistory = history.filter(h => h.text && h.text.trim() !== '');
    if (validHistory.length === 0) {
        console.warn("generateAIResponseStream called with empty history. Yielding default message.");
        yield "Em có thể nói lại được không?";
        return;
    }
    const contents = validHistory.map(h => ({ parts: [{ text: h.text }], role: h.role === 'user' ? 'user' : 'model' }));

    try {
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.8,
            }
        });
        
        for await (const chunk of responseStream) {
            if (chunk.text) {
                yield chunk.text;
            }
        }
    } catch (error) {
        console.error("Error generating AI response stream:", error);
        yield "Mình không nghe rõ, em có thể nói lại được không?";
    }
}

export async function textToSpeech(text: string): Promise<string> {
    if (!text || !text.trim()) {
        console.warn("textToSpeech called with empty input. Skipping API call.");
        return "";
    }
    try {
         const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'Kore' }, // Soft female voice
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data received");
        return base64Audio;
    } catch (error) {
        console.error("Error generating speech:", error);
        throw error;
    }
}

export async function analyzeChildsSpeech(conversation: {sender: string, text: string}[], childsText: string): Promise<{ accuracy: number; engagement: string; psychologicalNote: string, isDistressed: boolean }> {
    const prompt = `Phân tích đoạn văn bản cuối cùng của một đứa trẻ Việt Nam bị chậm nói trong bối cảnh cuộc trò chuyện này.
    Cuộc trò chuyện: ${JSON.stringify(conversation)}
    Văn bản của trẻ: "${childsText}"

    Dựa trên văn bản, hãy cung cấp:
    1.  Đánh giá độ chính xác về mặt ngữ nghĩa và sự liên quan đến cuộc trò chuyện (từ 0 đến 100).
    2.  Mức độ tương tác của trẻ (ví dụ: 'Cao', 'Trung bình', 'Thấp').
    3.  Một ghi chú tâm lý ngắn gọn (ví dụ: 'có vẻ vui', 'mệt mỏi', 'bị phân tâm', 'bối rối').
    4.  Phát hiện dấu hiệu đau khổ (ví dụ: khóc, buồn, đau) và trả về true nếu có, ngược lại false.
    
    Chỉ trả lời bằng một đối tượng JSON.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        accuracy: { type: Type.NUMBER },
                        engagement: { type: Type.STRING },
                        psychologicalNote: { type: Type.STRING },
                        isDistressed: { type: Type.BOOLEAN }
                    },
                },
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error analyzing speech:", error);
        return {
            accuracy: 50,
            engagement: 'Không xác định',
            psychologicalNote: 'Không thể phân tích',
            isDistressed: false,
        };
    }
}

export async function generateSessionSummary(reportData: Pick<SessionReport, 'conversation' | 'psychologicalNotes' | 'topic'>): Promise<string> {
    const prompt = `Bạn là một chuyên gia tâm lý trẻ em và nhà trị liệu ngôn ngữ. Dựa vào cuộc trò chuyện và các ghi chú tâm lý sau đây từ một buổi học nói cho trẻ em Việt Nam, hãy viết một đoạn đánh giá toàn diện.

    **Dữ liệu:**
    - **Chủ đề:** ${reportData.topic}
    - **Cuộc trò chuyện:**
    ${reportData.conversation.map(m => `${m.sender === 'ai' ? 'AI' : 'Bé'}: ${m.text}`).join('\n')}
    - **Ghi chú tâm lý tự động:** ${reportData.psychologicalNotes.join('; ')}

    **Yêu cầu:**
    Viết một bản đánh giá theo cấu trúc sau:
    1.  **Tổng quan buổi học:** Tóm tắt ngắn gọn về sự tương tác và mức độ tham gia của trẻ trong chủ đề.
    2.  **Phân tích hành vi & tâm lý:** Dựa vào lời nói và ghi chú, phân tích trạng thái cảm xúc của trẻ (vui vẻ, hứng thú, mệt mỏi, bối rối, v.v.) và hành vi nổi bật.
    3.  **Điểm mạnh:** Nêu bật những điểm tích cực trẻ đã thể hiện (ví dụ: chủ động trả lời, phát âm tốt một số từ, sáng tạo).
    4.  **Điểm cần cải thiện:** Nhận diện những khó khăn trẻ gặp phải (ví dụ: trả lời lạc đề, khó diễn đạt, phát âm sai).
    5.  **Gợi ý cho phụ huynh:** Đưa ra 1-2 lời khuyên cụ thể, đơn giản mà phụ huynh có thể áp dụng để hỗ trợ trẻ trong giao tiếp hàng ngày hoặc chuẩn bị cho buổi học tiếp theo.

    **Lưu ý:** Giữ giọng văn chuyên nghiệp, cảm thông, tích cực và tập trung vào việc hỗ trợ sự phát triển của trẻ. Chỉ trả lời bằng nội dung đánh giá.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Using a more advanced model for better analysis
            contents: prompt,
            config: {
                temperature: 0.7
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating session summary:", error);
        return "Không thể tạo bản đánh giá tự động do có lỗi xảy ra.";
    }
}