const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

const port = process.env.PORT || 8000;

app.get('/health', (req, res) => {
    res.json({ status: "ok", message: "Server is fast!" });
});

app.post('/v1/answer', (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Missing query" });

    // 1. Extract all [VERIFIED] statements (robust to spaces and case)
    const verifiedMatches = [...query.matchAll(/\[\s*VERIFIED\s*\]\s*(.*)/gi)];
    if (verifiedMatches.length === 0) return res.json({ output: "" });

    // 2. Use only the [VERIFIED] statements for answering
    // Example: [VERIFIED] The capital of Australia is Canberra.
    // Find the last question in the query
    let answer = "";
    let statement = verifiedMatches[verifiedMatches.length - 1][1].trim();
    let outputInstruction = "";
    const outputInstrMatch = query.match(/Output ([^\n\r\.]*) only\.?/i);
    if (outputInstrMatch) outputInstruction = outputInstrMatch[1].trim();

    // Try to extract the answer according to the instruction
    if (outputInstruction) {
        // Try to find the word after 'is' or 'are' in the statement
        let afterIs = statement.match(/is ([^\.;]+)/i);
        if (!afterIs) afterIs = statement.match(/are ([^\.;]+)/i);
        if (afterIs) {
            answer = afterIs[1].trim();
        } else {
            // fallback: take the last word
            answer = statement.split(' ').pop();
        }
    } else {
        // fallback: take the whole statement
        answer = statement;
    }

    // Remove trailing punctuation and whitespace
    answer = answer.replace(/[\.;]+$/, '').trim();

    return res.json({ output: answer });
});

app.listen(port, () => {
    console.log(`Level 7 Logic API running on port ${port}`);
});
