from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv('GROQ_API_KEY')
print("API Key found:", api_key[:10] if api_key else "NOT FOUND")

client = Groq(api_key=api_key)

response = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[{"role": "user", "content": "say hello"}]
)

print("SUCCESS:", response.choices[0].message.content)