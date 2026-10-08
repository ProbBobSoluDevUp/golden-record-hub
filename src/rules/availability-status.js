function deriveAvailabilityStatus(item) {
    if (item.status === "DISCONTINUED") {
        return "DISCONTINUED";
    }

    if (item.quantityOnHand > 0) {
        return "IN_STOCK";
    }

    if (item.quantityOnOrder > 0) {
        return "ON_ORDER";
    }

    return "NEEDS_ORDER";
}

module.exports = { deriveAvailabilityStatus };