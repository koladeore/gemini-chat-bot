import { useEffect, useState } from "react";
import GeminiService from "../service/gemini.service";

export default function useGemini() {
    const [messages, updateMessage] = useState(checkForMessages());    
    const [loading, setLoading] = useState(false);
    const nonCSResponse = "This is a computer science advising system. Please ask computer science-related questions.";
    function checkForMessages() {
        const savedMessages = localStorage.getItem('messages');
        return savedMessages ? JSON.parse(savedMessages) : [];
    }
    function isGreeting(query) {
        const greetings = ["hi", "hello", "hey"];
        return greetings.includes(query.toLowerCase());
    }

    function isFarewell(query) {
        const farewells = ["bye", "goodbye", "see you"];
        return farewells.includes(query.toLowerCase());
    }

    function isCourseRelated(query) {
        const coursePattern = /\bCSC[- ]?(\d{3})\b/i;
        return coursePattern.test(query);
    }

    function isStudyRelated(query) {
        return query.toLowerCase().includes("study");
    }

    function isComputerScienceRelated(query) {
        const csKeywords = [
            "computer", "programming", "software", "hardware", "algorithm", "data", "network", "security", "AI", "machine learning", "database", "system", "engineering", "development"
        ];
        return csKeywords.some(keyword => query.toLowerCase().includes(keyword.toLowerCase()));
    }

    useEffect(() => {
        const saveMessages = () => localStorage.setItem('messages', JSON.stringify(messages));
        window.addEventListener('beforeunload', saveMessages);
        return () => window.removeEventListener('beforeunload', saveMessages);
    }, [messages]);

    const sendMessages = async (payload) => {
        const messageText = payload.message.toLowerCase();
        if (isGreeting(messageText)) {
            updateMessage((prevMessages) => [
                ...prevMessages, 
                { "role": "model", "parts": [{ "text": "Hello! How can I assist you with computer science-related questions.?" }] }
            ]);
            return;
        }
        if (isFarewell(messageText)) {
            updateMessage((prevMessages) => [
                ...prevMessages, 
                { "role": "model", "parts": [{ "text": "Goodbye! Have a great day!" }] }
            ]);
            return;
        }
        if (isCourseRelated(messageText) || isStudyRelated(messageText) || isComputerScienceRelated(messageText)) {
            updateMessage((prevMessages) => [...prevMessages, { "role": "model", "parts": [{ "text": "" }] }]);
            setLoading(true);
            try {
                console.log("message", payload);
                const stream = await GeminiService.sendMessages(payload.message, payload.history);
                setLoading(false);
                for await (const chunk of stream) {
                    const chuckText = chunk.text();
                    updateMessage((prevMessages) => {
                        const prevMessageClone = structuredClone(prevMessages);
                        prevMessageClone[prevMessages.length - 1].parts[0].text += chuckText;
                        return prevMessageClone;
                    });
                }
            } catch (error) {
                updateMessage([...messages, { "role": "model", "parts": [{ "text": "Seems like I'm having trouble connecting to the server. Please try again later." }] }]);
                console.error('An error occurred:', error);
            } finally {
                setLoading(false);
            }
        } else {
            updateMessage((prevMessages) => [
                ...prevMessages, 
                { "role": "model", "parts": [{ "text": nonCSResponse }] }
            ]);
        }
    };

    return { messages, loading, sendMessages, updateMessage };
}
