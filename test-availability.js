const fs = require("fs");

const {
  deriveAvailabilityStatus
} = require("./src/rules/availability-status");

const items = JSON.parse(
  fs.readFileSync("sample-data/items.json", "utf8")
);

let passed = 0;
let failed = 0;

for (const item of items) {
  const calculatedStatus = deriveAvailabilityStatus(item);
  const expectedStatus = item.availabilityStatus;

  if (calculatedStatus === expectedStatus) {
    console.log(
      `✅ PASS — SKU ${item.sku}: expected ${expectedStatus}, got ${calculatedStatus}`
    );
    passed++;
  } else {
    console.error(
      `❌ FAIL — SKU ${item.sku}: expected ${expectedStatus}, got ${calculatedStatus}`
    );
    failed++;
    process.exitCode = 1;
  }
}

console.log("\nAvailability Test Summary");
console.log("-------------------------");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${items.length}`);