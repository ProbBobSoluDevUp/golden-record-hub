// Data-quality engine: runs the rules and builds the quality report.
//
// Both the API (src/server.js) and the terminal report
// (scripts/run-quality-check.js) use this file, so they always agree.

const { rules } = require("./rules/data-quality-rules");

// Run every rule against one item.
// allItems and index let DUPLICATE_SKU compare the item with the others.
function checkItem(item, allItems, index) {
    const context = { allItems, index };
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

// Check every item and summarize the results.
function buildQualityReport(items) {
    const results = items.map((item, index) => {
        const problems = checkItem(item, items, index);

        return {
            record: index + 1,
            sku: item.sku ?? null,
            result: problems.length === 0 ? "PASS" : "FAIL",
            // Auto-fixable only when every problem on the record has a fix.
            autoFixable: problems.length > 0 && problems.every((p) => p.suggestedFix !== null),
            problems
        };
    });

    const failed = results.filter((r) => r.result === "FAIL");
    const autoFixable = failed.filter((r) => r.autoFixable).length;
    const pass = results.length - failed.length;

    const failuresByRule = {};
    for (const rule of rules) failuresByRule[rule.id] = 0;
    for (const r of failed) {
        for (const p of r.problems) failuresByRule[p.rule] += 1;
    }

    // Percent of records that pass every rule, to one decimal place.
    const passRate = results.length === 0 ? 0 : Math.round((pass / results.length) * 1000) / 10;

    const summary = {
        checked: results.length,
        rules: rules.length,
        pass,
        fail: failed.length,
        passRate,
        autoFixable,
        needsReview: failed.length - autoFixable,
        failuresByRule
    };

    return { generatedAt: new Date().toISOString(), summary, results };
}

module.exports = { checkItem, buildQualityReport };