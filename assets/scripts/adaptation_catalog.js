
let countries = [];
let projects = [];
let all_projects = [];
let filtered_projects = [];
let country_ids = [];
let theme_ids = [];
let approach_ids = [];
let hazard_ids = [];
let scale_ids = [];
let donor_ids = [];
let duration_min;
let duration_max;

const selected_countries = document.getElementById("selected_countries");
const selected_themes = document.getElementById("selected_themes");
const selected_approaches = document.getElementById("selected_approaches");
const selected_hazards = document.getElementById("selected_hazards");
const selected_scales = document.getElementById("selected_scales");
const selected_donors = document.getElementById("selected_donors");
let budget_min = document.getElementById("budget_min");
let budget_max = document.getElementById("budget_max");
const container = document.getElementById("table-container");

// alert box display
function pageAlert(text, success) {
    let alertIcon = success !== null || success !== undefined
        ? (success
            ? `<img src="assets/images/success.png"><h5 class="success-text-popup my-2">SUCCESS!</h5>`
            : `<img src="assets/images/success-false.png"><h5 class="success-text-popup my-2">ERROR!</h5>`)
        : "";
    $("div#icon-alert-modal").empty().html(alertIcon);
    $("h5#text-alert-modal").empty().html(text);
    $("div.modal#alertModal").modal("show");
}

let cookieObject = getCookies(document.cookie);
const authToken = cookieObject.jwt;
const isLoggedIn = cookieObject.isLoggedIn;
const initialCountryId = cookieObject.initialCountryId;
const userEmail = cookieObject.userEmail;
isLoggedIn ? $("li#user-email-label").empty().html(`<div class='mx-3'>${userEmail}</div>`) : $("li#user-email-label").empty();
let applied_count = 0;
$(document).ready(function () {
    $(".selectpicker").selectpicker({
        selectedTextFormat: "count > 1",
        size: 5,
    });
});

duration_min = document.getElementById("year-datepicker");
duration_max = document.getElementById("year-datepicker-1");
const lookup_url = `${apiUrl}/catalog/lookups`;

const data = {
    key1: "value1",
};

const options = {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
};

let lookups_headers = [
    "country",
    "approach",
    "donor",
    "scale",
    "theme",
    "climate_hazard",
];
fetch(lookup_url, options)
    .then((response) => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then((data) => {
        localStorage.setItem("lookup_data", JSON.stringify(data))
        for (let j = 0; j < lookups_headers.length; j++) {
            let information = data.data.find(
                (item) => item.table === lookups_headers[j]
            );

            if (information.table === "country") {
                countries = information.lookup_data;
                countries.sort((a, b) => a.country.localeCompare(b.country));

                selected_countries.innerHTML = "";
            } else if (information.table === "theme") {
                let themes = information.lookup_data;
                themes.sort((a, b) => a.theme.localeCompare(b.theme));

                selected_themes.innerHTML = "";

                for (let i = 0; i < themes.length; i++) {
                    const option = document.createElement("option");
                    option.value = themes[i].id;
                    option.selected = true;
                    option.textContent = themes[i].theme;
                    selected_themes.appendChild(option);
                }
                $(selected_themes).selectpicker("refresh");
                $(selected_themes).selectpicker("render");
            } else if (information.table === "approach") {
                let approaches = information.lookup_data;
                approaches.sort((a, b) => a.approach.localeCompare(b.approach));

                selected_approaches.innerHTML = "";

                for (let i = 0; i < approaches.length; i++) {
                    const option = document.createElement("option");
                    option.value = approaches[i].id;
                    option.selected = true;
                    option.textContent = approaches[i].approach;
                    selected_approaches.appendChild(option);
                }
                $(selected_approaches).selectpicker("refresh");
                $(selected_approaches).selectpicker("render");
            } else if (information.table === "climate_hazard") {
                let climate_hazards = information.lookup_data;
                climate_hazards.sort((a, b) =>
                    a.climate_hazard.localeCompare(b.climate_hazard)
                );

                selected_hazards.innerHTML = "";

                for (let i = 0; i < climate_hazards.length; i++) {
                    const option = document.createElement("option");
                    option.value = climate_hazards[i].id;
                    option.selected = true;
                    option.textContent = climate_hazards[i].climate_hazard;
                    selected_hazards.appendChild(option);
                }
                $(selected_hazards).selectpicker("refresh");
                $(selected_hazards).selectpicker("render");
            } else if (information.table === "scale") {
                let scales = information.lookup_data;
                scales.sort((a, b) => a.scale.localeCompare(b.scale));

                selected_scales.innerHTML = "";

                for (let i = 0; i < scales.length; i++) {
                    const option = document.createElement("option");
                    option.value = scales[i].id;
                    option.selected = true;
                    option.textContent = scales[i].scale;
                    selected_scales.appendChild(option);
                }
                $(selected_scales).selectpicker("refresh");
                $(selected_scales).selectpicker("render");
            } else if (information.table === "donor") {
                let donors = information.lookup_data;
                donors.sort((a, b) => a.donor.localeCompare(b.donor));

                selected_donors.innerHTML = "";

                for (let i = 0; i < donors.length; i++) {
                    const option = document.createElement("option");
                    option.value = donors[i].id;
                    option.selected = true;
                    option.textContent = donors[i].donor;
                    selected_donors.appendChild(option);
                }
                $(selected_donors).selectpicker("refresh");
                $(selected_donors).selectpicker("render");
            }
        }

        set_budget_range(data);
        set_duration_range(data);

        get_filtered_data("");
    })
    .catch((error) => {
        console.error("Error:", error);
    });

function set_budget_range(data) {
    let budget_range = data.ranges.budget;

    const budget_min_input = $("#budget_min");
    const budget_max_input = $("#budget_max");

    // Destroy any existing Ion.RangeSlider instances
    const existingSlider = $("#example-slider").data("ionRangeSlider");
    existingSlider && existingSlider.destroy();

    const slider = $("#example-slider")
        .ionRangeSlider({
            min: budget_range.min,
            max: budget_range.max,
            prefix: "$ ",
            type: "double",
            step: 5,
            from: budget_range.min, // Initial start value
            to: budget_range.max, // Initial end value
        })
        .data("ionRangeSlider");

    slider.update({
        from: budget_range.min,
        to: budget_range.max,
    });

    // Function to update slider and input fields
    const updateSliderAndInputs = function (data) {
        const from = data.from;
        const to = data.to;

        budget_min_input.val(from);
        budget_max_input.val(to);
    };

    // Attach event handler to update slider and input fields when slider changes
    slider.options.onChange = function (data) {
        updateSliderAndInputs(data);
        convertToReadableNotation();
    };

    // Attach event handler to update slider and input fields when input fields change
    budget_min_input.on("input", function () {
        const from = parseInt(budget_min_input.val());
        const to = parseInt(budget_max_input.val());

        if (!isNaN(from) && !isNaN(to) && from <= to) {
            slider.update({
                from: from,
                to: to,
            });
        }
    });

    budget_max_input.on("input", function () {
        const from = parseInt(budget_min_input.val());
        const to = parseInt(budget_max_input.val());

        if (!isNaN(from) && !isNaN(to) && from <= to) {
            slider.update({
                from: from,
                to: to,
            });
        }
    });

    // Attach an event handler to the "Reset Filter" button
    $("#resetFilterBtn").click(function () {
        window.location.reload();
        slider.update({
            from: budget_range.min,
            to: budget_range.max,
        });
    });

    // Initialize input fields with initial slider values
    updateSliderAndInputs(slider.result);
    convertToReadableNotation();
}

function set_duration_range(data) {
    let duration_range = data.ranges.duration;

    const duration_min_input = $("#year-datepicker");
    const duration_max_input = $("#year-datepicker-1");

    // Destroy any existing Ion.RangeSlider instances
    const existingSlider = $("#example-slider1").data("ionRangeSlider");
    existingSlider && existingSlider.destroy();

    const slider1 = $("#example-slider1")
        .ionRangeSlider({
            min: duration_range.min,
            max: duration_range.max,
            prefix: "",
            type: "double",
            step: 1,
            from: duration_range.min, // Initial start value
            to: duration_range.max, // Initial end value
        })
        .data("ionRangeSlider");

    slider1.update({
        from: duration_range.min,
        to: duration_range.max,
    });

    // Function to update slider and input fields
    const updateSliderAndInputs1 = function (data) {
        const from = data.from;
        const to = data.to;

        duration_min_input.val(from);
        duration_max_input.val(to);
    };

    // Attach event handler to update slider and input fields when slider changes
    slider1.options.onChange = function (data) {
        updateSliderAndInputs1(data);
    };

    // Attach event handlers to input fields
    duration_min_input.on("input", function () {
        const from = parseInt(duration_min_input.val());
        const to = parseInt(duration_max_input.val());

        // Ensure from is less than or equal to to
        if (from <= to) {
            slider1.update({
                from: from,
                to: to,
            });
        }
    });

    duration_max_input.on("input", function () {
        const from = parseInt(duration_min_input.val());
        const to = parseInt(duration_max_input.val());

        // Ensure from is less than or equal to to
        if (from <= to) {
            slider1.update({
                from: from,
                to: to,
            });
        }
    });

    // Initialize input fields with initial slider values
    updateSliderAndInputs1(slider1.result);
}

async function get_filtered_data(text_) {
    var selected_countries_options = Array.from(
        selected_countries.selectedOptions
    );
    country_ids = selected_countries_options.map((option) =>
        parseInt(option.value)
    );

    // Themes
    var selected_themes_options = Array.from(selected_themes.selectedOptions);
    theme_ids = selected_themes_options.map((option) => parseInt(option.value));

    // Approaches
    var selected_approaches_options = Array.from(
        selected_approaches.selectedOptions
    );
    approach_ids = selected_approaches_options.map((option) =>
        parseInt(option.value)
    );

    // Hazards
    var selected_hazards_options = Array.from(selected_hazards.selectedOptions);
    hazard_ids = selected_hazards_options.map((option) =>
        parseInt(option.value)
    );

    // selected_scales
    var selected_scales_options = Array.from(selected_scales.selectedOptions);
    scale_ids = selected_scales_options.map((option) => parseInt(option.value));

    // selected_donors
    var selected_donors_options = Array.from(selected_donors.selectedOptions);
    var donor_ids = selected_donors_options.map((option) =>
        parseInt(option.value)
    );

    duration_min = document.getElementById("year-datepicker");
    duration_max = document.getElementById("year-datepicker-1");

    const dashboard_url = `${apiUrl}/catalog/dashboard`;

    const dashboard_data = {
        country_ids: country_ids,
        hazard_ids: hazard_ids,
        approach_ids: approach_ids,
        scale_ids: scale_ids,
        theme_ids: theme_ids,
        donor_ids: donor_ids,
        budget: {
            min: parseInt(budget_min.value),
            max: parseInt(budget_max.value),
        },
        duration: {
            min: parseInt(duration_min.value),
            max: parseInt(duration_max.value),
        },
    };

    const dashboard_options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `${authToken}`,
        },
        body: JSON.stringify(dashboard_data),
    };

    fetch(dashboard_url, dashboard_options)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            projects = data.data;
            filtered_projects = projects;
            if (text_ == "apply") {
                generateTable(filtered_projects);
            }
            const mapProps = new MapProps("-map-id");

            let themeIds = [];
            let approachesIds = [];
            let hazardIds = [];
            let scaleIds = [];
            let donorIds = [];
            let countryIds = [];
            let budgets = [];
            let durations = [];

            for (let i = 0; i < projects.length; i++) {
                if (projects[i]["theme_ids"] !== null) {
                    themeIds.push(...projects[i]["theme_ids"]);
                }
                if (projects[i]["approach_ids"] !== null) {
                    approachesIds.push(...projects[i]["approach_ids"]);
                }
                if (projects[i]["hazard_ids"] !== null) {
                    hazardIds.push(...projects[i]["hazard_ids"]);
                }
                if (projects[i]["scale_ids"] !== null) {
                    scaleIds.push(...projects[i]["scale_ids"]);
                }
                if (projects[i]["donor_ids"] !== null) {
                    donorIds.push(...projects[i]["donor_ids"]);
                }
                if (projects[i]["country_ids"] !== null) {
                    countryIds.push(...projects[i]["country_ids"]);
                }
                budgets.push(projects[i]["budget"]);
                durations.push(new Date(projects[i]["start_date"]).getFullYear());
                durations.push(new Date(projects[i]["end_date"]).getFullYear());
            }
            themeIds = [...new Set(themeIds)];
            approachesIds = [...new Set(approachesIds)];
            hazardIds = [...new Set(hazardIds)];
            scaleIds = [...new Set(scaleIds)];
            donorIds = [...new Set(donorIds)];
            countryIds = [...new Set(countryIds)];
            durations = [...new Set(durations)];

            // Assuming countryIdsToChange is an array of country_ids you want to change the colors for
            if (applied_count < 1) {
                all_projects = data.data
                generateTable(all_projects);
                mapProps.changeCountryColors(countryIds, projects);
                countries = countries.filter((item) => {
                    return countryIds.includes(item["id"]);
                });

                for (let i = 0; i < countries.length; i++) {
                    const option = document.createElement("option");
                    option.value = countries[i].id;
                    option.selected = true;
                    option.textContent = countries[i].country;
                    selected_countries.appendChild(option);
                }
                $("#selected_countries").selectpicker("refresh");
                $("#selected_countries").selectpicker("render");
                applied_count++;
            } else {
                // $("#map-popup").hide();
                mapProps.country_changes(country_ids, projects);
            }

            for (var i = 0; i < selected_themes.options.length; i++) {
                if (themeIds.includes(parseInt(selected_themes.options[i].value))) {
                    selected_themes.options[i].selected = true;
                } else {
                    selected_themes.options[i].selected = false;
                }
            }
            $("#selected_themes").selectpicker("refresh");
            $("#selected_themes").selectpicker("render");

            for (var i = 0; i < selected_approaches.options.length; i++) {
                if (
                    approachesIds.includes(
                        parseInt(selected_approaches.options[i].value)
                    )
                ) {
                    selected_approaches.options[i].selected = true;
                } else {
                    selected_approaches.options[i].selected = false;
                }
            }
            $("#selected_approaches").selectpicker("refresh");
            $("#selected_approaches").selectpicker("render");

            for (var i = 0; i < selected_hazards.options.length; i++) {
                if (hazardIds.includes(parseInt(selected_hazards.options[i].value))) {
                    selected_hazards.options[i].selected = true;
                } else {
                    selected_hazards.options[i].selected = false;
                }
            }
            $("#selected_hazards").selectpicker("refresh");
            $("#selected_hazards").selectpicker("render");

            for (var i = 0; i < selected_scales.options.length; i++) {
                if (scaleIds.includes(parseInt(selected_scales.options[i].value))) {
                    selected_scales.options[i].selected = true;
                } else {
                    selected_scales.options[i].selected = false;
                }
            }
            $("#selected_scales").selectpicker("refresh");
            $("#selected_scales").selectpicker("render");

            for (var i = 0; i < selected_donors.options.length; i++) {
                if (donorIds.includes(parseInt(selected_donors.options[i].value))) {
                    selected_donors.options[i].selected = true;
                } else {
                    selected_donors.options[i].selected = false;
                }
            }
            $("#selected_donors").selectpicker("refresh");
            $("#selected_donors").selectpicker("render");
            let data_ = {
                ranges: {
                    budget: { min: Math.min(...budgets), max: Math.max(...budgets) },
                    duration: {
                        min: Math.min(...durations),
                        max: Math.max(...durations),
                    },
                },
            };
            set_budget_range(data_);
            set_duration_range(data_);
        })
        .catch((error) => {
            console.error("Error:", error);
        });
}

// Function to generate the HTML table
function generateTable(data) {
    localStorage.setItem("catalog_projects", JSON.stringify(data))
    container.innerHTML = " ";
    let tableHTML = '<table class="table table-bordered project_tbl">';
    tableHTML +=
        "<thead><tr><th>Project Name</th><th>Country</th><th>Duration</th><th>Budget</th></tr></thead>";
    tableHTML += "<tbody>";

    data.forEach((project) => {
        tableHTML += "<tr>";
        tableHTML += `<td><a href="adaptation_catalog_details.html?id=${project.id}" target="_blank">${project.project_name}</a></td>`;
        tableHTML += `<td>${name_extractor(project)}</td>`;
        tableHTML += `<td>${year_extractor(
            project.start_date
        )}&nbsp;to&nbsp;${year_extractor(project.end_date)}</td>`;
        tableHTML += `<td>$${number_conversion(project.budget)}</td>`;
        tableHTML += "</tr>";
    });

    tableHTML += "</tbody></table>";
    container.innerHTML = tableHTML;
}

function year_extractor(date) {
    const dateString = date;
    const year = dateString.split("-")[0];
    return year;
}

function name_extractor(project) {
    const selectedCountries = countries
        .filter(
            (country) =>
                project.country_ids && project.country_ids.includes(country.id)
        )
        .map((country) => country.country);
    return selectedCountries.join(", ");
}

function projects_filter(countryId) {
    const filteredProjects = all_projects.filter(
        (data) => data.country_ids && data.country_ids.includes(countryId)
    );

    filtered_projects = filteredProjects;
    generateTable(filteredProjects);
    const mapProps = new MapProps("-map-id");
    mapProps.country_changes([countryId]);
    for (var i = 0; i < selected_countries.options.length; i++) {
        if (selected_countries.options[i].value == countryId) {
            selected_countries.options[i].selected = true;
        } else {
            selected_countries.options[i].selected = false;
        }
    }
    $("#selected_countries").selectpicker("refresh");
    $("#selected_countries").selectpicker("render");
}

if (!isLoggedIn) {
    pageAlert("Please log in", 0);
    setTimeout(() => window.location.replace("index.html"), 1000);
}

function onLogoutClick() {
    document.cookie = `userEmail=null`;
    document.cookie = `jwt=null`;
    document.cookie = `isLoggedIn=false`;
    document.cookie = `userRoleId=null`;
    window.location.replace("index.html");
}

function convertToReadableNotation() {
    let inputElement = $("#formattedMaxBudget");
    let dollarValue = parseInt($("#budget_max").val());
    element_dollar(inputElement, dollarValue);

    let inputElement1 = $("#formattedMinBudget");
    let dollarValue1 = parseInt($("#budget_min").val());
    element_dollar(inputElement1, dollarValue1);
}

function element_dollar(inputElement, dollarValue) {
    if (!isNaN(dollarValue)) {
        const is_valid = dollarValue > 999;
        const formattedValue = is_valid ? number_conversion(dollarValue) : "";
        inputElement.text(is_valid ? `(${formattedValue})` : "");
    } else {
        inputElement.text("");
    }
}

function number_conversion(labelValue) {
    // Nine Zeroes for Billions
    return Math.abs(Number(labelValue)) >= 1.0e9
        ? (Math.abs(Number(labelValue)) / 1.0e9).toFixed(2).replace(/\.0+$/, "") +
        "B"
        : // Six Zeroes for Millions
        Math.abs(Number(labelValue)) >= 1.0e6
            ? (Math.abs(Number(labelValue)) / 1.0e6).toFixed(2).replace(/\.0+$/, "") +
            "M"
            : // Three Zeroes for Thousands
            Math.abs(Number(labelValue)) >= 1.0e3
                ? (Math.abs(Number(labelValue)) / 1.0e3).toFixed(2).replace(/\.0+$/, "") +
                "K"
                : Math.abs(Number(labelValue));
}