import os
from fastapi import FastAPI
from pydantic import BaseModel
from openai import OpenAI

app = FastAPI()

print("\n" + "="*40)
print("SERVER STARTING: VERSION 5.0 (Level 3 - YES/NO)")
print("="*40 + "\n")

# Initialize Groq client
client = OpenAI(
    api_key=os.environ.get("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)

class QueryRequest(BaseModel):
    query: str
    assets: list[str] = []

class QueryResponse(BaseModel):
    output: str

@app.get("/")
async def root():
    return {"status": "online", "version": "5.0", "message": "API is ready for evaluation"}

@app.post("/v1/answer")
async def answer(request: QueryRequest):
    print(f"DEBUG - Received Query: '{request.query}'")

    system_prompt = (
        "You are a yes/no answer bot. Answer every question with ONLY the word YES or NO in uppercase.\n"
        "STRICT RULES:\n"
        "- Your entire response must be exactly one word: YES or NO\n"
        "- Always use UPPERCASE.\n"
        "- No punctuation, no explanation, no extra words.\n"
        "\n"
        "EXAMPLES:\n"
        "- Query: 'Is 9 an odd number?' -> YES\n"
        "- Query: 'Is the sky green?' -> NO\n"
        "- Query: 'Is Paris the capital of France?' -> YES\n"
        "- Query: 'Is 100 a prime number?' -> NO\n"
    )

    user_content = request.query
    if request.assets:
        asset_text = "\n".join(request.assets)
        user_content = f"{request.query}\n\nAsset URLs:\n{asset_text}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.0,
            max_tokens=5,
        )
        raw_output = completion.choices[0].message.content.strip().upper()

        # Normalize — only keep YES or NO
        if "YES" in raw_output:
            final_output = "YES"
        elif "NO" in raw_output:
            final_output = "NO"
        else:
            final_output = raw_output

    except Exception as e:
        print(f"ERROR during LLM call: {e}")
        final_output = "error"

    print(f"DEBUG - Final Output: '{final_output}'")

    return {
        "output": final_output,
        "result": final_output,
        "answer": final_output,
        "response": final_output
    }
