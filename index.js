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

    let answer = "";

    // Check if this is a [VERIFIED] type query
    const verifiedMatches = [...query.matchAll(/\[\s*VERIFIED\s*\]\s*(.*)/gi)];
    
    if (verifiedMatches.length > 0) {
        // Handle [VERIFIED] statements
        let statement = verifiedMatches[verifiedMatches.length - 1][1].trim();
        let outputInstruction = "";
        const outputInstrMatch = query.match(/Output ([^\n\r\.]*) only\.?/i);
        if (outputInstrMatch) outputInstruction = outputInstrMatch[1].trim();

        function extractAfterIsAre(str) {
            let afterIs = str.match(/is ([^\.;]+)/i);
            if (!afterIs) afterIs = str.match(/are ([^\.;]+)/i);
            return afterIs ? afterIs[1].trim() : str;
        }

        if (/city name|country name|person name|name/i.test(outputInstruction)) {
            answer = extractAfterIsAre(statement);
        } else if (/number/i.test(outputInstruction)) {
            const numMatch = statement.match(/[-+]?\d*\.?\d+/);
            if (numMatch) answer = numMatch[0];
            else answer = extractAfterIsAre(statement);
        } else if (/date/i.test(outputInstruction)) {
            const dateMatch = statement.match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{1,2} \w+ \d{4}/);
            if (dateMatch) answer = dateMatch[0];
            else answer = extractAfterIsAre(statement);
        } else {
            answer = extractAfterIsAre(statement);
        }
        answer = answer.replace(/[\.;]+$/, '').trim();
    } else {
        // Handle transaction log queries
        const logMatch = query.match(/log\s*[:-]?\s*(.*)/i);
        if (logMatch) {
            const entries = logMatch[1].split(/\s*\|\s*|\s*,\s*|\s+-\s+/).map(e => e.trim()).filter(Boolean);
            const transactions = entries.map(entry => {
                const match = entry.match(/^([A-Za-z]+)\s+paid\s*\$?(\d+)/i);
                if (!match) return null;
                return { name: match[1], amount: Number(match[2]), raw: entry };
            }).filter(Boolean);

            // Find conditions from query
            const startsWithMatch = query.match(/name starts with ['\"]?([A-Za-z])['\"]?/i);
            const greaterThanMatch = query.match(/greater than\s*\$?(\d+)/i);
            const lessThanMatch = query.match(/less than\s*\$?(\d+)/i);

            let startsWith = startsWithMatch ? startsWithMatch[1] : "";
            let greaterThan = greaterThanMatch ? Number(greaterThanMatch[1]) : -1;
            let lessThan = lessThanMatch ? Number(lessThanMatch[1]) : Infinity;

            // Find FIRST matching transaction (preserve order)
            const result = transactions.find(t => {
                let matches = true;
                if (startsWith && !t.name.startsWith(startsWith)) matches = false;
                if (greaterThan >= 0 && t.amount <= greaterThan) matches = false;
                if (lessThan !== Infinity && t.amount >= lessThan) matches = false;
                return matches;
            });

            if (result) {
                answer = `${result.name} paid the amount of $${result.amount}.`;
            }
        }
    }

    // Respond with all accepted keys for maximum compatibility
    return res.json({
        output: answer,
        result: answer,
        answer: answer,
        response: answer
    });
});

app.listen(port, () => {
    console.log(`Level 7 Logic API running on port ${port}`);
});
