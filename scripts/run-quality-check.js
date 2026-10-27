// Runs every data-quality rule against every item, prints a report,
// and saves the full results to reports/quality-results.json.
//
// Run from the project folder:  node scripts/run-quality-check.js

const fs = require("fs");
const path = require("path");
const { buildQualityReport } = require("../src/quality");

const itemsPath = path.join(__dirname, "..", "sample-data", "items.json");
const resultsPath = path.join(__dirname, "..", "reports", "quality-results.json");

const items = JSON.parse(fs.readFileSync(itemsPath, "utf8"));
const report = buildQualityReport(items);
const { summary, results } = report;
const failed = results.filter((r) => r.result === "FAIL");

// -----------------------------
// PRINT THE REPORT
// -----------------------------

console.log("");
console.log("Golden Record Hub: data quality report");
console.log(`Checked ${summary.checked} records against ${summary.rules} rules`);
console.log("");
console.log(`PASS  ${summary.pass}`);
console.log(`FAIL  ${summary.fail}  (${summary.autoFixable} auto-fixable, ${summary.needsReview} need review)`);
console.log(`Quality score  ${summary.passRate}%`);
console.log("");
console.log("Failures by rule");
for (const [ruleId, count] of Object.entries(summary.failuresByRule)) {
    console.log(`  ${ruleId.padEnd(22)} ${count}`);
}
console.log("");
console.log("Failed records");
for (const r of failed) {
    const label = `#${r.record}`.padEnd(5);
    const tag = r.autoFixable ? "[auto-fix]" : "[review]  ";
    for (const p of r.problems) {
        console.log(`  ${label} ${tag} ${p.rule.padEnd(22)} ${p.message}`);
    }
}

// -----------------------------
// SAVE THE RESULTS
// -----------------------------

fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
fs.writeFileSync(resultsPath, JSON.stringify(report, null, 2));

console.log("");
console.log("Full results saved to reports/quality-results.json");