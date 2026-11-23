
import os
from flask import Flask, request, jsonify, send_from_directory
from groq import Groq
from dotenv import load_dotenv

# Project paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Load API key
load_dotenv(os.path.join(BASE_DIR, "config", ".env"))

# Flask app
app = Flask(
    __name__,
    static_folder=os.path.join(BASE_DIR, "frontend"),
    static_url_path=""
)

# Groq client
client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

# FitnessGPT instructions
SYSTEM_PROMPT = """
You are FitnessGPT AI, a friendly fitness and healthy diet assistant.

Give beginner-friendly workout plans and healthy Indian diet suggestions.

Consider the user's age, height, weight, fitness goal and food preference.

Use simple English, headings and bullet points.

Include warm-up, cool-down and rest days in workout plans.

Never diagnose diseases or prescribe medicines.
Avoid crash diets and extreme workouts.
Recommend professional medical advice when appropriate.

Stay focused on fitness, healthy food and general wellness.
"""

# Home page
@app.route("/")
def home():
    return send_from_directory(app.static_folder, "index.html")


# AI Chat API
@app.route("/api/chat", methods=["POST"])
def chat():

    try:
        data = request.get_json()

        message = data.get("message", "")

        if not message:
            return jsonify({"reply": "Please enter a message."}), 400

        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": message
                }
            ],
            temperature=0.7
        )

        reply = response.choices[0].message.content

        return jsonify({"reply": reply})

    except Exception as e:
        print("Error:", str(e))
        return jsonify({"reply": "AI connection failed. Please try again."}), 500


# Run server
if __name__ == "__main__":
    app.run(debug=True)
