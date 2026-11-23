
const messages = document.getElementById("messages");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");

const chatArea = document.getElementById("chatArea");
const welcome = document.getElementById("welcome");

const chatPage = document.getElementById("chatPage");
const historyPage = document.getElementById("historyPage");

const historyList = document.getElementById("historyList");
const pageTitle = document.getElementById("pageTitle");

const chatNav = document.getElementById("chatNav");
const historyNav = document.getElementById("historyNav");

const newChatBtn = document.getElementById("newChatBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

let chatHistory = JSON.parse(
    localStorage.getItem("fitnessChatHistory") || "[]"
);

let currentChat = [];
let currentChatId = Date.now();

let recognition = null;
let voiceTranscript = "";
let isListening = false;
let voiceReplyEnabled = false;

let typingElement = null;


// SAVE HISTORY

function saveHistory() {

    if (currentChat.length === 0) return;

    const existingIndex = chatHistory.findIndex(
        chat => chat.id === currentChatId
    );

    const chatData = {
        id: currentChatId,
        title: currentChat[0].content.substring(0, 35),
        messages: currentChat,
        date: new Date().toLocaleString()
    };

    if (existingIndex >= 0) {
        chatHistory[existingIndex] = chatData;
    } else {
        chatHistory.unshift(chatData);
    }

    localStorage.setItem(
        "fitnessChatHistory",
        JSON.stringify(chatHistory)
    );
}


// FORMAT MESSAGE SAFELY

function formatMessage(text) {

    const escaped = String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    return escaped
        .replace(/&lt;br\s*\/?&gt;/gi, "<br>")
        .replace(/\n/g, "<br>");
}


// DISPLAY MESSAGE

function addMessage(role, content, save = true) {

    const wrapper = document.createElement("div");
    wrapper.className = `message ${role}`;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    bubble.innerHTML = formatMessage(content);

    wrapper.appendChild(bubble);

    if (role === "assistant") {

        const actions = document.createElement("div");
        actions.className = "message-actions";

        const readBtn = document.createElement("button");
        readBtn.className = "voice-btn";
        readBtn.textContent = "🔊 Read Answer";

        readBtn.onclick = () => {
            readAnswer(content);
        };

        const stopBtn = document.createElement("button");
        stopBtn.className = "voice-btn";
        stopBtn.textContent = "⏹ Stop";

        stopBtn.onclick = stopReading;

        actions.appendChild(readBtn);
        actions.appendChild(stopBtn);

        wrapper.appendChild(actions);
    }

    messages.appendChild(wrapper);

    chatArea.scrollTop = chatArea.scrollHeight;

    if (save) {

        currentChat.push({
            role: role,
            content: content
        });

        saveHistory();
    }

    return wrapper;
}


// VOICE ANSWER

function readAnswer(text) {

    if (!("speechSynthesis" in window)) {
        alert("Voice output is not supported in this browser.");
        return;
    }

    window.speechSynthesis.cancel();

    const cleanText = String(text)
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/\*\*/g, "")
        .replace(/[#*_`]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const speech = new SpeechSynthesisUtterance(cleanText);

    speech.lang = "en-IN";
    speech.rate = 0.95;
    speech.pitch = 1;

    window.speechSynthesis.speak(speech);
}


function stopReading() {

    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }
}


// TYPING INDICATOR

function showTyping() {

    typingElement = document.createElement("div");
    typingElement.className = "typing";
    typingElement.textContent = "FitnessGPT is thinking...";

    messages.appendChild(typingElement);

    chatArea.scrollTop = chatArea.scrollHeight;
}


function removeTyping() {

    if (typingElement) {
        typingElement.remove();
        typingElement = null;
    }
}


// SEND MESSAGE

async function sendMessage(text = null) {

    const message = (text || userInput.value).trim();

    if (!message) return;

    stopReading();

    userInput.value = "";

    welcome.style.display = "none";

    addMessage("user", message);

    sendBtn.disabled = true;
    sendBtn.textContent = "Thinking...";

    showTyping();

    try {

        const response = await fetch("/api/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: message
            })

        });

        const data = await response.json();

        removeTyping();

        if (!response.ok) {
            throw new Error(
                data.error || data.message || "Server error"
            );
        }

        const answer =
            data.reply ||
            data.response ||
            data.answer ||
            "Sorry, I could not generate an answer.";

        addMessage("assistant", answer);

        if (voiceReplyEnabled) {
            readAnswer(answer);
            voiceReplyEnabled = false;
        }

    } catch (error) {

        removeTyping();

        addMessage(
            "assistant",
            "Sorry! AI connection failed. Please try again.\n\nError: " +
            error.message
        );

        voiceReplyEnabled = false;

    } finally {

        sendBtn.disabled = false;
        sendBtn.textContent = "Send ➤";
        userInput.focus();

    }
}


// MICROPHONE VOICE INPUT

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (SpeechRecognition) {

    recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {

        isListening = true;
        voiceTranscript = "";

        micBtn.textContent = "🛑";
        micBtn.classList.add("listening");
        userInput.placeholder = "Listening... Speak now";
    };


    recognition.onresult = (event) => {

        voiceTranscript = "";

        for (
            let i = event.resultIndex;
            i < event.results.length;
            i++
        ) {

            voiceTranscript +=
                event.results[i][0].transcript;
        }

        userInput.value = voiceTranscript;
    };


    recognition.onerror = (event) => {

        voiceReplyEnabled = false;

        if (event.error === "not-allowed") {
            alert("Please allow microphone permission in Chrome.");
        } else if (event.error === "no-speech") {
            alert("No speech detected. Please try again.");
        } else {
            alert("Voice recognition error: " + event.error);
        }
    };


    recognition.onend = () => {

        isListening = false;

        micBtn.textContent = "🎤";
        micBtn.classList.remove("listening");

        userInput.placeholder = "Ask anything about fitness...";

        const spokenMessage = voiceTranscript.trim();

        if (spokenMessage) {

            voiceReplyEnabled = true;

            sendMessage(spokenMessage);
        }
    };


    micBtn.addEventListener("click", () => {

        if (isListening) {

            recognition.stop();

        } else {

            stopReading();

            userInput.value = "";
            voiceTranscript = "";

            try {
                recognition.start();
            } catch (error) {
                alert("Microphone is busy. Please try again.");
            }
        }

    });

} else {

    micBtn.disabled = true;

    micBtn.title = "Voice recognition is not supported";

    micBtn.addEventListener("click", () => {
        alert("Please use Google Chrome for voice chat.");
    });

}


// SEND BUTTON

sendBtn.addEventListener("click", () => {
    voiceReplyEnabled = false;
    sendMessage();
});


// ENTER KEY

userInput.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {

        event.preventDefault();

        voiceReplyEnabled = false;

        sendMessage();
    }
});


// QUICK PROMPTS

document.querySelectorAll("[data-prompt]").forEach(button => {

    button.addEventListener("click", () => {

        voiceReplyEnabled = false;

        sendMessage(button.dataset.prompt);
    });

});


// NEW CHAT

newChatBtn.addEventListener("click", () => {

    stopReading();

    if (isListening) {
        recognition.stop();
    }

    currentChat = [];
    currentChatId = Date.now();

    messages.innerHTML = "";

    welcome.style.display = "block";

    showChatPage();
});


// SHOW CHAT PAGE

function showChatPage() {

    chatPage.classList.remove("hidden");
    historyPage.classList.add("hidden");

    chatNav.classList.add("active");
    historyNav.classList.remove("active");

    pageTitle.textContent = "FitnessGPT AI";
}


// SHOW HISTORY PAGE

function showHistoryPage() {

    chatPage.classList.add("hidden");
    historyPage.classList.remove("hidden");

    chatNav.classList.remove("active");
    historyNav.classList.add("active");

    pageTitle.textContent = "Chat History";

    renderHistory();
}


chatNav.addEventListener("click", showChatPage);

historyNav.addEventListener("click", showHistoryPage);


// RENDER HISTORY

function renderHistory() {

    historyList.innerHTML = "";

    if (chatHistory.length === 0) {

        historyList.textContent = "No chat history found.";

        return;
    }

    chatHistory.forEach(chat => {

        const item = document.createElement("div");

        item.className = "history-item";

        const title = document.createElement("strong");
        title.textContent = chat.title || "New Chat";

        const date = document.createElement("p");
        date.textContent = chat.date || "";

        item.appendChild(title);
        item.appendChild(date);

        item.addEventListener("click", () => {

            currentChatId = chat.id;

            currentChat = [...chat.messages];

            messages.innerHTML = "";

            welcome.style.display = "none";

            currentChat.forEach(msg => {
                addMessage(msg.role, msg.content, false);
            });

            showChatPage();
        });

        historyList.appendChild(item);
    });
}


// CLEAR HISTORY

clearHistoryBtn.addEventListener("click", () => {

    if (!confirm("Are you sure you want to delete all chat history?")) {
        return;
    }

    chatHistory = [];

    localStorage.removeItem("fitnessChatHistory");

    currentChat = [];
    currentChatId = Date.now();

    messages.innerHTML = "";

    welcome.style.display = "block";

    renderHistory();
});


// INITIALIZE

showChatPage();
