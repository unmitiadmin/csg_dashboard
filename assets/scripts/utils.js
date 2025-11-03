

const lookupsReqBody = {
    "tables": [
        "country",
        "province",
        "district",
        "category",
        "funding_size",
        "current_status",
        "agro_ecology",
        "types_of_beneficiaries",
        "beneficiaries_categories",
        "sector",
        "climate_hazard",
        "risk",
        "purpose_of_adaptation",
        "adaptation_typology",
        "adaptation_typology_subcategory",
        "scale",
        "governance_level",
        "sdg_goals",
        "sendai_drr_indicators",
        "funding_organizations",
        "implementation_partners",
        "other_partners"
    ]
};

const cookieFields = ["userEmail", "jwt", "isLoggedIn", "countryId", "userRoleId", "initialCountryId"];
const getCookies = (cookiesStr) => {
    let cookiesObj = {};
    cookiesStr.split("; ").map(e => {
        let [k, v] = e.split("=");
        if (cookieFields.includes(k)) cookiesObj[k] = ["isLoggedIn", "countryId"].includes(k) ? eval(v) : v;
    });
    return cookiesObj;
};

const strNum = (number) => {
    return number >= 1000000000 ? (number / 1000000000).toFixed(2) + " Billion"
        : number >= 1000000 ? (number / 1000000).toFixed(2) + " Million"
            : number >= 100000 ? (number / 1000).toFixed(0) + "K"
                : number >= 1000 ? (number / 1000).toFixed(1) + "K"
                    : number;
};

// Highcharts.setOptions({
//     lang: {
//         numericSymbols: ['K', 'M', 'B', 'T']
//     }
// });

let flagIndex = {
    2: "Zambia",
    4: "Sri Lanka",
    7: "Senegal",
    5: "Kenya",
};

