// Golden Record Hub: browser page
//
// Item lookup: calls GET /items/:sku and shows the item's availability.
// Data quality: calls GET /dq/summary and shows the quality report.

// Same check as the SKU_FORMAT rule. The browser checks first so the user
// gets instant feedback; the hub's rules are still the real authority.
const SKU_PATTERN = /^\d{7}$/;

// How each availabilityStatus code is shown to a salesperson.
const STATUS_DISPLAY = {
    IN_STOCK: { label: "In stock", tone: "in-stock", note: "Ready to sell today." },
    ON_ORDER: { label: "On order", tone: "on-order", note: "Not on the shelf yet. More is on order." },
    NEEDS_ORDER: { label: "Needs order", tone: "needs-order", note: "Nothing on hand or on order. Check with the buyer." },
    DISCONTINUED: { label: "Discontinued", tone: "discontinued", note: "No longer sold. Offer the customer a substitute." }
};

const form = document.getElementById("lookup-form");
const input = document.getElementById("sku");
const errorText = document.getElementById("sku-error");
const result = document.getElementById("result");

// -----------------------------
// EVENTS
// -----------------------------

form.addEventListener("submit", (event) => {
    event.preventDefault(); // stay on this page instead of reloading it
    lookUp(input.value);
});

input.addEventListener("input", () => {
    errorText.textContent = "";
});

document.querySelectorAll("[data-sku]").forEach((button) => {
    button.addEventListener("click", () => {
        input.value = button.dataset.sku;
        lookUp(button.dataset.sku);
    });
});

// -----------------------------
// LOOKUP
// -----------------------------

async function lookUp(rawSku) {
    const sku = rawSku.trim();

    if (!SKU_PATTERN.test(sku)) {
        errorText.textContent = "SKUs are exactly 7 digits, like 1000025";
        input.focus();
        return;
    }

    errorText.textContent = "";

    let response;
    try {
        response = await fetch(`/items/${encodeURIComponent(sku)}`);
    } catch {
        showMessage("Can't reach the hub. Is the server running?");
        return;
    }

    if (response.status === 404) {
        showMessage(`No item with SKU ${sku}. Check the number and try again.`);
        return;
    }

    if (!response.ok) {
        showMessage(`The hub returned an error (${response.status}). Try again.`);
        return;
    }

    showItem(await response.json());
}

// -----------------------------
// DISPLAY
// -----------------------------

function showItem(item) {
    const status = STATUS_DISPLAY[item.availabilityStatus] ?? {
        label: item.availabilityStatus ?? "Unknown",
        tone: "unknown",
        note: "This availability status isn't recognized."
    };

    const titleBlock = el("div");
    titleBlock.append(
        el("h2", "item-name", item.productName ?? "(no product name)"),
        el("p", "item-meta", [item.sku, item.brand, item.category].filter(Boolean).join(" · "))
    );

    const header = el("div", "card-header");
    header.append(titleBlock, el("span", `pill ${status.tone}`, status.label));

    const card = el("article", "card");
    card.append(
        header,
        el("p", "status-note", status.note),
        detailRow("On hand", item.quantityOnHand),
        detailRow("On order", item.quantityOnOrder)
    );

    result.replaceChildren(card);
}

function detailRow(label, value) {
    const row = el("div", "row");
    row.append(el("span", "row-label", label), el("span", "row-value", value ?? "Not recorded"));
    return row;
}

function showMessage(text) {
    result.replaceChildren(el("p", "message", text));
}

// -----------------------------
// DATA QUALITY PANEL
// -----------------------------

// Friendly names for the rule IDs. Any rule not listed shows its ID.
const RULE_LABELS = {
    REQUIRED_FIELDS: "Missing required fields",
    SKU_FORMAT: "SKU format",
    DUPLICATE_SKU: "Duplicate SKU",
    ALLOWED_VALUES: "Value not allowed",
    NO_EXTRA_SPACES: "Extra spaces",
    PACK_SIZE_FORMAT: "Pack size format",
    QUANTITY_VALID: "Invalid quantity",
    AVAILABILITY_MATCHES: "Availability mismatch"
};

const qualityArea = document.getElementById("quality");
const refreshButton = document.getElementById("refresh-quality");

refreshButton.addEventListener("click", loadQuality);
loadQuality(); // load the report once when the page opens

async function loadQuality() {
    let response;
    try {
        response = await fetch("/dq/summary");
    } catch {
        qualityArea.replaceChildren(el("p", "message", "Can't load the quality report. Is the server running?"));
        return;
    }

    if (!response.ok) {
        qualityArea.replaceChildren(el("p", "message", `The hub returned an error (${response.status}). Try again.`));
        return;
    }

    showQuality(await response.json());
}

function showQuality(report) {
    const { summary, failedRecords, generatedAt } = report;

    // Score and meter
    const score = el("div", "score");
    score.append(
        el("p", "score-value", `${summary.passRate}%`),
        el("p", "score-label", `Quality score: ${summary.pass} of ${summary.checked} records pass all ${summary.rules} rules`)
    );

    const meter = el("div", "meter");
    const meterFill = el("div", "meter-fill");
    meterFill.style.width = `${summary.passRate}%`;
    meter.append(meterFill);

    // Count tiles
    const tiles = el("div", "tiles");
    tiles.append(
        tile("Pass", summary.pass),
        tile("Fail", summary.fail),
        tile("Auto-fixable", summary.autoFixable),
        tile("Needs review", summary.needsReview)
    );

    // Failures by rule, most failures first
    const ruleList = el("div", "rule-list");
    const ruleCounts = Object.entries(summary.failuresByRule).sort((a, b) => b[1] - a[1]);
    const most = Math.max(1, ...ruleCounts.map(([, count]) => count));

    for (const [ruleId, count] of ruleCounts) {
        const bar = el("div", "rule-bar");
        const barFill = el("div", "rule-bar-fill");
        barFill.style.width = `${(count / most) * 100}%`;
        bar.append(barFill);

        const row = el("div", "rule-row");
        row.append(el("span", "rule-name", RULE_LABELS[ruleId] ?? ruleId), bar, el("span", "rule-count", count));
        ruleList.append(row);
    }

    // Records that failed at least one rule
    const recordList = el("ul", "record-list");
    for (const record of failedRecords) {
        const top = el("div", "record-top");
        top.append(
            el("span", "record-id", `#${record.record} · ${record.sku ?? "no SKU"}`),
            el("span", `tag ${record.autoFixable ? "auto-fix" : "review"}`, record.autoFixable ? "Auto-fix" : "Needs review")
        );

        const item = el("li", "record");
        item.append(top);
        for (const problem of record.problems) {
            item.append(el("p", "record-problem", problem.message));
        }
        recordList.append(item);
    }

    qualityArea.replaceChildren(
        score,
        meter,
        tiles,
        el("h3", "section-title", "Failures by rule"),
        ruleList,
        el("h3", "section-title", `Records to review (${failedRecords.length})`),
        failedRecords.length > 0 ? recordList : el("p", "message", "Every record passes. Nothing to review."),
        el("p", "checked-at", `Checked ${new Date(generatedAt).toLocaleString()}`)
    );
}

function tile(label, value) {
    const box = el("div", "tile");
    box.append(el("span", "tile-value", value), el("span", "tile-label", label));
    return box;
}

// Create an element with an optional class and text.
// textContent (not innerHTML) shows data exactly as text,
// so nothing stored in a record can run as code on this page.
function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
}