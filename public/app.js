// Golden Record Hub: item lookup page
//
// Calls the hub's own API (GET /items/:sku) and shows the item's availability.

// Same check as the SKU_FORMAT rule. The browser checks first so the user
// gets instant feedback; the hub's rules are still the real authority.
const SKU_PATTERN = /^\d{7}$/;

// How each availabilityStatus code is shown to a salesperson.
const STATUS_DISPLAY = {
    IN_STOCK: {
        label: "In stock",
        tone: "in-stock",
        note: "Ready to sell today.",
    },
    ON_ORDER: {
        label: "On order",
        tone: "on-order",
        note: "Not on the shelf yet. More is on order.",
    },
    NEEDS_ORDER: {
        label: "Needs order",
        tone: "needs-order",
        note: "Nothing on hand or on order. Check with the buyer.",
    },
    DISCONTINUED: {
        label: "Discontinued",
        tone: "discontinued",
        note: "No longer sold. Offer the customer a substitute.",
    },
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
        note: "This availability status isn't recognized.",
    };

    const titleBlock = el("div");
    titleBlock.append(
        el("h2", "item-name", item.productName ?? "(no product name)"),
        el(
            "p",
            "item-meta",
            [item.sku, item.brand, item.category].filter(Boolean).join(" · "),
        ),
    );

    const header = el("div", "card-header");
    header.append(titleBlock, el("span", `pill ${status.tone}`, status.label));

    const card = el("article", "card");
    card.append(
        header,
        el("p", "status-note", status.note),
        detailRow("On hand", item.quantityOnHand),
        detailRow("On order", item.quantityOnOrder),
    );

    result.replaceChildren(card);
}

function detailRow(label, value) {
    const row = el("div", "row");
    row.append(
        el("span", "row-label", label),
        el("span", "row-value", value ?? "Not recorded"),
    );
    return row;
}

function showMessage(text) {
    result.replaceChildren(el("p", "message", text));
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
