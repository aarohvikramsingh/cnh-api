const express = require('express');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
app.use(express.json());

const port = process.env.PORT || 8000;

const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

app.get('/health', (req, res) => {
    res.json({ status: "ok", message: "Server is fast!" });
});

app.post('/v1/answer', async (req, res) => {
    const startTime = Date.now();
    const { query, assets } = req.body;
    
    if (!query) return res.status(400).json({ error: "Missing query" });

    console.log(`\n--- INCOMING QUERY ---\n${query}`);

    try {
        // We use Chain of Thought so the AI can do the math step-by-step
        // But we force it to put the final answer in an <output> tag so we can extract it cleanly.
        const systemPrompt = `You are a strict, rule-following logic and extraction engine.
You will be given complex text, transaction logs, rules, or logic problems.

INSTRUCTIONS:
1. Work through the logic step-by-step inside <thought> tags.
2. Once you have the final result, put ONLY the final answer inside an <output> tag.
3. The <output> tag must contain the EXACT final answer formatted correctly. Do not add conversational text inside the output tag.
4. For transaction logs, you must format the output exactly as: "[Name] paid the amount of $[Amount]." (including the period at the end).

EXAMPLE:
<thought>
Input: Extract the FIRST transaction > $100 by user starting with 'S' from "- Sam paid $80 | Steve paid $210 | Sara paid $150"
- Sam: starts with S, amount $80 (not > 100) -> Skip
- Steve: starts with S, amount $210 (> 100) -> Match!
The matched transaction is Steve paying $210.
</thought>
<output>Steve paid the amount of $210.</output>`;

        const completion = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile", // Use the smart model for logic
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: query }
            ],
            temperature: 0,
            max_tokens: 150,
        });

        const rawResponse = completion.choices[0].message.content;
        console.log(`\n--- AI RAW RESPONSE ---\n${rawResponse}`);

        // Extract just the value inside the <output> tag
        let finalOutput = "";
        const outputMatch = rawResponse.match(/<output>(.*?)<\/output>/is);
        
        if (outputMatch) {
            finalOutput = outputMatch[1].trim();
        } else {
            // Fallback if the AI fails to use the tag
            finalOutput = rawResponse.trim();
            if (finalOutput.includes("</thought>")) {
                finalOutput = finalOutput.split("</thought>")[1].trim();
            }
        }

        // Clean up quotes just in case
        finalOutput = finalOutput.replace(/['"]+/g, '');

        console.log(`\nSECURE DEBUG [AI Result] (${Date.now() - startTime}ms) -> "${finalOutput}"\n----------------------`);

        res.json({ output: finalOutput });

    } catch (error) {
        console.error("LLM Error:", error.message);
        res.json({ output: "Error", error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Level 7 Logic API running on port ${port}`);
});
