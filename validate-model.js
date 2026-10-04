const fs = require("fs");

const model = JSON.parse(
  fs.readFileSync("data-model.json", "utf8")
);

function check(condition, message) {
  if (condition) {
    console.log("✅", message);
  } else {
    console.error("❌", message);
    process.exitCode = 1;
  }
}

check(model.modelName, "Model has a name");
check(Array.isArray(model.objectTypes), "objectTypes is an array");
check(Array.isArray(model.listsOfValues), "listsOfValues is an array");

const lovIds = model.listsOfValues.map((lov) => lov.id);

for (const objectType of model.objectTypes) {
  check(objectType.id, `${objectType.name} has an ID`);
  check(
    Array.isArray(objectType.attributes),
    `${objectType.name} has an attributes array`
  );

  for (const attribute of objectType.attributes) {
    if (attribute.type === "lov") {
      check(
        lovIds.includes(attribute.listOfValuesId),
        `${attribute.name} references an existing list of values`
      );
    }
  }
}

console.log("\nValidation complete.");