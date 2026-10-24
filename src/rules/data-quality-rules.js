// Data-quality rules for item records.
//
// Every rule has the same shape:
//   id    - short name that shows up in the report
//   check - returns null when the item is OK, or a message describing the problem
//   fix   - optional; returns the corrected field values, or null when a person has to decide

const { deriveAvailabilityStatus } = require("./availability-status");

// Allowed values for list fields (lists of values).
const ALLOWED_VALUES = {
    status: ["ACTIVE", "DISCONTINUED"],
    category: ["DAIRY", "PRODUCE", "DRY_GOODS", "FROZEN", "CONDIMENTS"],
    brand: ["NORTHSTAR", "PRAIRIE FOODS", "SUMMIT", "RIVERBEND", "GOLDEN VALLEY"]
};

const REQUIRED_FIELDS = [
    "sku",
    "productName",
    "brand",
    "category",
    "quantityOnHand",
    "quantityOnOrder",
    "status",
    "availabilityStatus"
];

const TEXT_FIELDS = ["sku", "productName", "brand", "category", "status"];
const QUANTITY_FIELDS = ["quantityOnHand", "quantityOnOrder"];

// A pack size like "12 / 1" with spaces around the slash.
const SPACED_PACK_SIZE = /(\d+)\s*\/\s*(\d+)/g;

function isMissing(value) {
    return value === undefined || value === null || String(value).trim() === "";
}

function cleanSpaces(text) {
    return text.trim().replace(/\s{2,}/g, " ");
}

const rules = [
    {
        id: "REQUIRED_FIELDS",
        check(item) {
            const missing = REQUIRED_FIELDS.filter((field) => isMissing(item[field]));
            if (missing.length === 0) return null;
            return `Missing required field(s): ${missing.join(", ")}`;
        }
    },

    {
        id: "SKU_FORMAT",
        check(item) {
            if (isMissing(item.sku)) return null; // REQUIRED_FIELDS already reports this
            if (/^\d{7}$/.test(item.sku)) return null;
            return `SKU "${item.sku}" must be exactly 7 digits`;
        }
    },

    {
        id: "DUPLICATE_SKU",
        // Only the later copy is flagged; the first record with a SKU keeps it.
        check(item, context) {
            const firstIndex = context.allItems.findIndex((other) => other.sku === item.sku);
            if (firstIndex === context.index) return null;
            return `SKU ${item.sku} is already used by record ${firstIndex + 1}`;
        }
    },

    {
        id: "ALLOWED_VALUES",
        check(item) {
            const problems = [];
            for (const [field, allowed] of Object.entries(ALLOWED_VALUES)) {
                const value = item[field];
                if (isMissing(value) || allowed.includes(value)) continue;
                problems.push(`${field} "${value}" is not an allowed value`);
            }
            if (problems.length === 0) return null;
            return problems.join("; ");
        },
        // Fixable only when uppercasing turns the value into an allowed one.
        fix(item) {
            const changes = {};
            for (const [field, allowed] of Object.entries(ALLOWED_VALUES)) {
                const value = item[field];
                if (isMissing(value) || allowed.includes(value)) continue;
                const upper = String(value).trim().toUpperCase();
                if (!allowed.includes(upper)) return null;
                changes[field] = upper;
            }
            return changes;
        }
    },

    {
        id: "NO_EXTRA_SPACES",
        check(item) {
            const messy = TEXT_FIELDS.filter(
                (field) => typeof item[field] === "string" && item[field] !== cleanSpaces(item[field])
            );
            if (messy.length === 0) return null;
            return `Extra spaces in: ${messy.join(", ")}`;
        },
        fix(item) {
            const changes = {};
            for (const field of TEXT_FIELDS) {
                if (typeof item[field] === "string" && item[field] !== cleanSpaces(item[field])) {
                    changes[field] = cleanSpaces(item[field]);
                }
            }
            return changes;
        }
    },

    {
        id: "PACK_SIZE_FORMAT",
        check(item) {
            if (typeof item.productName !== "string") return null;
            const cleaned = item.productName.replace(SPACED_PACK_SIZE, "$1/$2");
            if (cleaned === item.productName) return null;
            return `Pack size in "${item.productName}" should have no spaces around the slash`;
        },
        fix(item) {
            return { productName: item.productName.replace(SPACED_PACK_SIZE, "$1/$2") };
        }
    },

    {
        id: "QUANTITY_VALID",
        check(item) {
            const bad = QUANTITY_FIELDS.filter((field) => {
                const value = item[field];
                if (isMissing(value)) return false; // REQUIRED_FIELDS already reports this
                return !(Number.isInteger(value) && value >= 0);
            });
            if (bad.length === 0) return null;
            const details = bad.map((field) => `${field} is ${item[field]}`).join("; ");
            return `${details} (must be a whole number, 0 or more)`;
        }
    },

    {
        id: "AVAILABILITY_MATCHES",
        // availabilityStatus is calculated, so the fix is to recalculate it.
        check(item) {
            const inputs = ["status", "quantityOnHand", "quantityOnOrder", "availabilityStatus"];
            if (inputs.some((field) => isMissing(item[field]))) return null;
            const expected = deriveAvailabilityStatus(item);
            if (item.availabilityStatus === expected) return null;
            return `availabilityStatus is ${item.availabilityStatus}, but the quantities say ${expected}`;
        },
        fix(item) {
            return { availabilityStatus: deriveAvailabilityStatus(item) };
        }
    }
];

module.exports = { rules, ALLOWED_VALUES };