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

    // Extract all [VERIFIED] statements (robust to spaces and case)
    const verifiedMatches = [...query.matchAll(/\[\s*VERIFIED\s*\]\s*(.*)/gi)];
    if (verifiedMatches.length === 0) return res.json({ output: "" });

    // Find the output instruction (e.g., Output city name only)
    let outputInstruction = "";
    const outputInstrMatch = query.match(/Output ([^\n\r\.]*) only\.?/i);
    if (outputInstrMatch) outputInstruction = outputInstrMatch[1].trim();

    // Use the last [VERIFIED] statement for the answer
    let statement = verifiedMatches[verifiedMatches.length - 1][1].trim();
    let answer = "";

    // Try to extract the answer according to the instruction
    if (outputInstruction) {
        // Try to find the word after 'is' or 'are' in the statement
        let afterIs = statement.match(/is ([^\.;]+)/i);
        if (!afterIs) afterIs = statement.match(/are ([^\.;]+)/i);
        if (afterIs) {
            answer = afterIs[1].trim();
        } else {
            // fallback: take the last word or phrase
            answer = statement.split(' ').slice(-1)[0];
        }
    } else {
        // fallback: take the whole statement
        answer = statement;
    }

    // Remove trailing punctuation and whitespace
    answer = answer.replace(/[\.;]+$/, '').trim();

    // If the instruction says to output only a number, extract the number
    if (/number/i.test(outputInstruction)) {
        const numMatch = answer.match(/\d+(\.\d+)?/);
        if (numMatch) answer = numMatch[0];
    }
    // If the instruction says to output only a date, extract the date
    if (/date/i.test(outputInstruction)) {
        const dateMatch = answer.match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{1,2} \w+ \d{4}/);
        if (dateMatch) answer = dateMatch[0];
    }

    return res.json({ output: answer });
});

app.listen(port, () => {
    console.log(`Level 7 Logic API running on port ${port}`);
});
