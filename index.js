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

    // Use the last [VERIFIED] statement for the answer
    let statement = verifiedMatches[verifiedMatches.length - 1][1].trim();

    // Find the output instruction (e.g., Output city name only)
    let outputInstruction = "";
    const outputInstrMatch = query.match(/Output ([^\n\r\.]*) only\.?/i);
    if (outputInstrMatch) outputInstruction = outputInstrMatch[1].trim();

    let answer = "";

    if (/city name/i.test(outputInstruction)) {
        // Extract after 'is' or 'are', take the first word (city name)
        let afterIs = statement.match(/is ([^\.;]+)/i);
        if (!afterIs) afterIs = statement.match(/are ([^\.;]+)/i);
        if (afterIs) {
            answer = afterIs[1].trim().split(' ')[0];
        } else {
            answer = statement.split(' ').pop();
        }
    } else if (/number/i.test(outputInstruction)) {
        const numMatch = statement.match(/\d+(\.\d+)?/);
        if (numMatch) answer = numMatch[0];
    } else if (/date/i.test(outputInstruction)) {
        const dateMatch = statement.match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{1,2} \w+ \d{4}/);
        if (dateMatch) answer = dateMatch[0];
    } else {
        // Default: extract after 'is' or 'are', else return the statement
        let afterIs = statement.match(/is ([^\.;]+)/i);
        if (!afterIs) afterIs = statement.match(/are ([^\.;]+)/i);
        if (afterIs) {
            answer = afterIs[1].trim();
        } else {
            answer = statement;
        }
    }

    // Remove trailing punctuation and whitespace
    answer = answer.replace(/[\.;]+$/, '').trim();

    return res.json({ output: answer });
});

app.listen(port, () => {
    console.log(`Level 7 Logic API running on port ${port}`);
});
