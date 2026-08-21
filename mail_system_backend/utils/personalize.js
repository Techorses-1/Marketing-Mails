// Replaces {{first_name}}, {{company}} etc. with actual contact data
const renderTemplate = (content, contact) => {
    if (!content) return content;
    return content.replace(/\{\{(.*?)\}\}/g, (match, key) => {
        const trimmedKey = key.trim();
        // Support custom.fieldName syntax for customFields
        if (trimmedKey.startsWith("custom.")) {
            const fieldName = trimmedKey.replace("custom.", "");
            return contact.customFields?.[fieldName] ?? "";
        }
        // Direct contact fields
        if (contact[trimmedKey] !== undefined && contact[trimmedKey] !== null) {
            return contact[trimmedKey];
        }
        // Unknown variable - leave as empty string, not literal {{tag}}
        return "";
    });
};

module.exports = { renderTemplate };