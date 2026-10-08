const fs = require("fs");

const {
    deriveAvailabilityStatus
} = require("./src/rules/availability-status");

const items = JSON.parse(
    fs.readFileSync("sample-data/items.json", "utf8")
);

for (const item of items) {
    const calculatedStatus = deriveAvailabilityStatus(item);

    console.log("SKU:", item.sku);
    console.log("Quantity On Hand:", item.quantityOnHand);
    console.log("Quantity On Order:", item.quantityOnOrder);
    console.log("Product Status:", item.status);
    console.log("Calculated Availability:", calculatedStatus);
}