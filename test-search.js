const terms = "Edwin Alvarez".split(/\s+/).filter(Boolean);
const termsLower = terms.map(t => t.toLowerCase());

const d = {
    firstName: "Carlos",
    lastName: "Perez",
    directors: [
        { firstName: "Edwin", lastName: "Alvarez" }, // should match!
        { firstName: "Edwin", lastName: "Vivero" }
    ],
    shareholders: [
        { firstName: "Carlos", lastName: "Alvarez" }
    ]
};

const d2 = {
    firstName: "Edwin",
    lastName: "Vivero",
    shareholders: [
        { firstName: "Carlos", lastName: "Alvarez" }
    ] // should NOT match, Edwin and Alvarez are not in the same person entity!
};

function testMatch(data) {
    let isValidMatch = false;

    if (terms.length === 1) {
        isValidMatch = true;
    } else {
        const topLevelStr = [data.firstName, data.lastName, data.fullName, data.name, data.beneficiaryName, data.passport, data.idNumber].filter(Boolean).join(' ').toLowerCase();
        if (termsLower.every(t => topLevelStr.includes(t))) {
            isValidMatch = true;
        }

        if (!isValidMatch) {
            const arrayFields = ['directors', 'dignitaries', 'shareholders', 'beneficiaries', 'members', 'peps', 'firmantes'];
            for (const field of arrayFields) {
                if (Array.isArray(data[field])) {
                    for (const person of data[field]) {
                        const personStr = JSON.stringify(person).toLowerCase();
                        if (termsLower.every(t => personStr.includes(t))) {
                            isValidMatch = true;
                            break;
                        }
                    }
                }
                if (isValidMatch) break;
            }
        }
    }
    return isValidMatch;
}

console.log("d1 matches? (Expected: true)", testMatch(d));
console.log("d2 matches? (Expected: false)", testMatch(d2));

