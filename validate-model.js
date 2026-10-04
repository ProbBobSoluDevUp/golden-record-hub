const fs = require("fs");

const model = JSON.parse(
  fs.readFileSync("data-model.json", "utf8")
);

console.log("Model loaded:", model.modelName);
console.log("Version:", model.version);
console.log("Object types:", model.objectTypes.length);
console.log("Lists of values:", model.listsOfValues.length);