const fs = require("fs");

const {
    deriveAvailabilityStatus
} = require("../src/rules/availability-status");

const brands = [
    "NORTHSTAR",
    "PRAIRIE FOODS",
    "SUMMIT",
    "RIVERBEND",
    "GOLDEN VALLEY"
];

const categories = [
    "DAIRY",
    "PRODUCE",
    "DRY_GOODS",
    "FROZEN",
    "CONDIMENTS"
];

const items = [];

// -----------------------------
// 38 CLEAN RECORDS
// -----------------------------

for (let i = 1; i <= 38; i++) {
    const item = {
        sku: String(1000000 + i),
        productName: `Sample Product ${i}`,
        brand: brands[(i - 1) % brands.length],
        category: categories[(i - 1) % categories.length],
        quantityOnHand: i % 4 === 0 ? 0 : i % 15,
        quantityOnOrder: i % 4 === 0 ? (i % 10) + 1 : 0,
        status: i % 11 === 0 ? "DISCONTINUED" : "ACTIVE"
    };

    item.availabilityStatus = deriveAvailabilityStatus(item);

    items.push(item);
}

// -----------------------------
// 12 INTENTIONALLY BAD RECORDS
// -----------------------------

function makeValidItem(number) {
    const item = {
        sku: String(1000000 + number),
        productName: `Sample Product ${number}`,
        brand: "NORTHSTAR",
        category: "DRY_GOODS",
        quantityOnHand: 5,
        quantityOnOrder: 0,
        status: "ACTIVE"
    };

    item.availabilityStatus = deriveAvailabilityStatus(item);

    return item;
}

// 39 — malformed SKU
const item39 = makeValidItem(39);
item39.sku = "ABC0039";
items.push(item39);

// 40 — duplicate SKU
const item40 = makeValidItem(40);
item40.sku = items[0].sku;
items.push(item40);

// 41 — missing product name
const item41 = makeValidItem(41);
delete item41.productName;
items.push(item41);

// 42 — lowercase brand
const item42 = makeValidItem(42);
item42.brand = "northstar";
items.push(item42);

// 43 — extra spaces
const item43 = makeValidItem(43);
item43.productName = "  Tomato Sauce  ";
items.push(item43);

// 44 — invalid product status
const item44 = makeValidItem(44);
item44.status = "RETIRED";
items.push(item44);

// 45 — negative quantity on hand
const item45 = makeValidItem(45);
item45.quantityOnHand = -3;
item45.quantityOnOrder = 0;
item45.availabilityStatus = deriveAvailabilityStatus(item45);
items.push(item45);

// 46 — negative quantity on order
const item46 = makeValidItem(46);
item46.quantityOnHand = 0;
item46.quantityOnOrder = -6;
item46.availabilityStatus = deriveAvailabilityStatus(item46);
items.push(item46);

// 47 — mismatched availability
const item47 = makeValidItem(47);
item47.availabilityStatus = "ON_ORDER";
items.push(item47);

// 48 — missing required field
const item48 = makeValidItem(48);
delete item48.quantityOnOrder;
items.push(item48);

// 49 — invalid category
const item49 = makeValidItem(49);
item49.category = "OFFICE_SUPPLIES";
items.push(item49);

// 50 — normalization problem
const item50 = makeValidItem(50);
item50.productName = "Ranch Dressing 12 / 1 LB";
items.push(item50);

// -----------------------------
// WRITE FILE
// -----------------------------

fs.writeFileSync(
    "sample-data/items.json",
    JSON.stringify(items, null, 2)
);

console.log(`Generated ${items.length} synthetic items.`);
console.log("38 clean records.");
console.log("12 records with deliberate data-quality problems.");