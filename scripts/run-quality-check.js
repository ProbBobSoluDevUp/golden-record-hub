// Runs every data-quality rule against every item, prints a report,
// and saves the full results to reports/quality-results.json.
//
// Run from the project folder:  node scripts/run-quality-check.js

const fs = require("fs");
const path = require("path");
const { rules } = require("../src/rules/data-quality-rules");

const itemsPath = path.join(__dirname, "..", "sample-data", "items.json");
const resultsPath = path.join(__dirname, "..", "reports", "quality-results.json");

const items = JSON.parse(fs.readFileSync(itemsPath, "utf8"));

// -----------------------------
// RUN THE RULES
// -----------------------------

const results = items.map((item, index) => {
    const context = { allItems: items, index };
    const problems = [];

    for (const rule of rules) {
        const message = rule.check(item, context);
        if (message) {
            const suggestedFix = rule.fix ? rule.fix(item) : null;
            problems.push({ rule: rule.id, message, suggestedFix });
        }
    }

    return {
        record: index + 1,
        sku: item.sku ?? null,
        result: problems.length === 0 ? "PASS" : "FAIL",
        // Auto-fixable only when every problem on the record has a fix.
        autoFixable: problems.length > 0 && problems.every((p) => p.suggestedFix !== null),
        problems
    };
});

// -----------------------------
// SUMMARIZE
// -----------------------------

const failed = results.filter((r) => r.result === "FAIL");
const autoFixable = failed.filter((r) => r.autoFixable).length;

const failuresByRule = {};
for (const rule of rules) failuresByRule[rule.id] = 0;
for (const r of failed) {
    for (const p of r.problems) failuresByRule[p.rule] += 1;
}

const summary = {
    checked: results.length,
    rules: rules.length,
    pass: results.length - failed.length,
    fail: failed.length,
    autoFixable,
    needsReview: failed.length - autoFixable,
    failuresByRule
};

// -----------------------------
// PRINT THE REPORT
// -----------------------------

console.log("");
console.log("Golden Record Hub: data quality report");
console.log(`Checked ${summary.checked} records against ${summary.rules} rules`);
console.log("");
console.log(`PASS  ${summary.pass}`);
console.log(`FAIL  ${summary.fail}  (${summary.autoFixable} auto-fixable, ${summary.needsReview} need review)`);
console.log("");
console.log("Failures by rule");
for (const [ruleId, count] of Object.entries(failuresByRule)) {
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
fs.writeFileSync(
    resultsPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), summary, results }, null, 2)
);

console.log("");
console.log("Full results saved to reports/quality-results.json");