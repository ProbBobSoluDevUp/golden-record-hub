// Golden Record Hub API
//
// Run from the project folder:  node src/server.js
// Then open http://localhost:3000/items in a browser.
// Stop it with Ctrl + C.

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

const itemsPath = path.join(__dirname, "..", "sample-data", "items.json");

// Read the file on every request, so regenerated data shows up without a restart.
function loadItems() {
    return JSON.parse(fs.readFileSync(itemsPath, "utf8"));
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

// "127.0.0.1" means only this computer can reach the API.
app.listen(PORT, "127.0.0.1", () => {
    console.log(`Golden Record Hub API running at http://localhost:${PORT}/items`);
});