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
const objectTypeIds = model.objectTypes.map((objectType) => objectType.id);

check(
    new Set(objectTypeIds).size === objectTypeIds.length,
    "Object type IDs are unique"
);
const lovIds = model.listsOfValues.map((lov) => lov.id);
check(
    new Set(lovIds).size === lovIds.length,
    "List of values IDs are unique"
);
for (const objectType of model.objectTypes) {
    check(objectType.id, `${objectType.name} has an ID`);
    check(
        Array.isArray(objectType.attributes),
        `${objectType.name} has an attributes array`
    );
    const attributeIds = objectType.attributes.map((attribute) => attribute.id);

    check(
        new Set(attributeIds).size === attributeIds.length,
        `${objectType.name} attribute IDs are unique`
    );
    for (const attribute of objectType.attributes) {
        check(attribute.id, `${attribute.name} has an ID`);
        check(attribute.name, `${attribute.id} has a name`);
        check(attribute.type, `${attribute.name} has a type`);
        check(
            attribute.required !== undefined,
            `${attribute.name} declares whether it is required`
        );
        if (attribute.type === "lov") {
            check(
                lovIds.includes(attribute.listOfValuesId),
                `${attribute.name} references an existing list of values`
            );
        }
    }
}

console.log("\nValidation complete.");