// Golden Record Hub API
//
// Run from the project folder:  node src/server.js
// Then open http://localhost:3000/items in a browser.
// Stop it with Ctrl + C.

const express = require("express");
const fs = require("fs");
const path = require("path");
const { rules } = require("./rules/data-quality-rules");
const { deriveAvailabilityStatus } = require("./rules/availability-status");

const app = express();
const PORT = 3000;

const itemsPath = path.join(__dirname, "..", "sample-data", "items.json");

// Turn JSON request bodies into JavaScript objects (available as req.body).
app.use(express.json());

// Indent JSON responses so they're readable in the browser and the terminal.
app.set("json spaces", 2);

// Read the file on every request, so regenerated data shows up without a restart.
function loadItems() {
    return JSON.parse(fs.readFileSync(itemsPath, "utf8"));
}

function saveItems(items) {
    fs.writeFileSync(itemsPath, JSON.stringify(items, null, 2));
}

// Run every data-quality rule against one new item.
// The new item goes at the end of the list, so DUPLICATE_SKU
// compares it with every item already in the hub.
function checkNewItem(item, existingItems) {
    const context = {
        allItems: [...existingItems, item],
        index: existingItems.length
    };
    const problems = [];

    for (const rule of rules) {
        const message = rule.check(item, context);
        if (message) {
            const suggestedFix = rule.fix ? rule.fix(item) : null;
            problems.push({ rule: rule.id, message, suggestedFix });
        }
    }

    return problems;
}

// GET /items: every item
app.get("/items", (req, res) => {
    res.json(loadItems());
});

// GET /items/1000025: one item, or a 404 if no item has that SKU
app.get("/items/:sku", (req, res) => {
    const item = loadItems().find((i) => i.sku === req.params.sku);

    if (!item) {
        return res.status(404).json({ error: `No item with SKU ${req.params.sku}` });
    }

    res.json(item);
});

// POST /items: add one item, but only if it passes every rule
app.post("/items", (req, res) => {
    const body = req.body;

    // 400 Bad Request: the request itself is malformed
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return res.status(400).json({
            error: "Send one item as a JSON object, with the header Content-Type: application/json"
        });
    }

    // availabilityStatus is calculated by the hub, never typed in by the sender.
    const item = { ...body, availabilityStatus: deriveAvailabilityStatus(body) };

    const items = loadItems();
    const problems = checkNewItem(item, items);

    // 422 Unprocessable Entity: the request is fine, but the item breaks business rules
    if (problems.length > 0) {
        return res.status(422).json({
            error: `Item failed ${problems.length} data-quality rule(s). Nothing was saved.`,
            problems
        });
    }

    items.push(item);
    saveItems(items);

    // 201 Created: the item passed and was saved
    res.status(201).json(item);
});

// "127.0.0.1" means only this computer can reach the API.
app.listen(PORT, "127.0.0.1", () => {
    console.log(`Golden Record Hub API running at http://localhost:${PORT}/items`);
});