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

    // Extract the log section (after "Log" or "log")
    const logMatch = query.match(/log\s*[:-]\s*(.*)/i);
    if (!logMatch) return res.json({ output: "" });

    // Split entries by | or , or " - " (robust to separators)
    const entries = logMatch[1].split(/\s*\|\s*|\s*,\s*|\s+-\s+/).map(e => e.trim()).filter(Boolean);

    // Parse each entry: "<Name> paid $<Amount>"
    const transactions = entries.map(entry => {
        const match = entry.match(/^([A-Za-z]+)\s+paid\s*\$?(\d+)/i);
        if (!match) return null;
        return { name: match[1], amount: Number(match[2]), raw: entry };
    }).filter(Boolean);

    // Find the FIRST transaction where name starts with 'S' and amount > 100 (case-sensitive)
    const result = transactions.find(t => t.name.startsWith('S') && t.amount > 100);

    // Format output
    let output = "";
    if (result) {
        output = `${result.name} paid the amount of $${result.amount}.`;
    }

    return res.json({ output });
});

app.listen(port, () => {
    console.log(`Level 7 Logic API running on port ${port}`);
});
