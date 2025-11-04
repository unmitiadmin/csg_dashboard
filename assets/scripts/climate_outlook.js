$(window).on("load", () => {
    let countryId = parseInt(getCookies(document.cookie).countryId) || parseInt(getCookies(document.cookie).initialCountryId);
    let userRoleId = parseInt(getCookies(document.cookie).userRoleId);
    let userEmail = getCookies(document.cookie).userEmail;
    let filterCountry = $("select#filter-country");
    let userMgmtLink = $("li#user-management-link");
    // userRoleId == 1 ? filterCountry.show() : filterCountry.hide();
    userRoleId == 1 ? userMgmtLink.show() : userMgmtLink.hide();
    let loggedInUserEmailLabel = $("li#user-email-label");
    loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${userEmail}</div>`);
    let userCountryIcon = $("img#user-country-icon");
    let isLoggedIn = getCookies(document.cookie).isLoggedIn;
    let initialCountryId = parseInt(getCookies(document.cookie).initialCountryId);
    isLoggedIn
        ? userRoleId != 1
            ? userCountryIcon.attr("src", `./assets/flag_icons/${initialCountryId}.png`).attr("title", flagIndex[initialCountryId]).show()
            : userCountryIcon.attr("src", null).attr("title", null).hide()
        : userCountryIcon.attr("src", null).attr("title", null).hide();
    // isLoggedIn
    //     ? userRoleId != 1 ? filterCountry.hide() : filterCountry.show()
    //     : filterCountry.show();
    filterCountry.on("change", () => switchClimateByCountry(filterCountry.val()));
    filterCountry.val(countryId).trigger("change");
});

const switchClimateByCountry = (countryId) => {
    document.cookie = `countryId=${countryId}`;
    switch (true) {
        case (countryId == 2):
            new ZambiaClimateOutlook().init();
            break;
        case (countryId == 4):
            new SrilankaClimateOutlook().init();
            break;
        case (countryId == 7):
            new SenegalClimateOutlook().init();
            break;
        case (countryId == 5):
            new KenyaClimateOutlook().init();
            break;
        default:
            break;
    }
}


class ZambiaClimateOutlook {
    constructor() {
        this.locations = [
            "Zambia",
            "Central", "Copperbelt", "Eastern",
            "Luapula", "Lusaka", "North-Western",
            "Northern", "Southern", "Western"
        ]; // change this if countries are different

        // filters
        this.filterFCProvince = $("select#filter-future-climate-province");
        this.filterFCVariable = $("select#filter-future-climate-variable");
        this.percentiles = ["50th", "10th-90th",];
        this.selectedPercentiles = [];
        this.filterFCPercentile = $("select#filter-future-climate-percentile");
        this.filterFCScenario = $("select#filter-future-climate-scenario");
        this.scenarioColorIndex = {
            "SSP-1.9": "blue",
            "SSP-2.6": "green",
            "SSP-4.5": "yellow",
            "SSP-7.0": "orange",
            "SSP-8.5": "red"
        }
        this.scenarios = Object.keys(this.scenarioColorIndex);
        this.selectedScenarios = [];

        this.tempVariables = [];
        this.actualPrecVariable = "Precipitation";
        this.precVariables = [];

        this.temperatureData = [];
        this.actualPrecipitationData = [];
        this.precipitationData = [];
        this.baselineYear = 2015;

        this.percentileValues = {
            "50th": "Medium",
            "10th-90th": "Low-High"
        };

        this.selectpickerCommonOptions = {
            actionsBox: true,
            liveSearch: true,
            selectedTextFormat: "count > 1",
            size: 5,
        };

        this.refFutureClimate = $("a#reference-fc");
        this.refFutureClimateLink = "https://climateknowledgeportal.worldbank.org/country/zambia/climate-data-projections";

        // 1st, 2nd and 4th tabs
        this.tabClimateRiskProfile = $("div#content-climate-risk-profile");
        this.tabClimateRiskVisualizer = $("div#content-climate-risk-visualizer");
        this.tabClimateSectorialImpact = $("div#content-sectorial-climate-impact");
        this.templateClimateRiskProfile = "zambia_climate_risk_profile.html";
        this.templateClimateRiskVisualizer = "zambia_climate_risk_visualizer.html";
        this.templateClimateSectorialImpact = "zambia_sectorial_climate_impact.html";
    }

    init = () => {
        this.filterFCProvince?.selectpicker("destroy");
        this.filterFCVariable?.selectpicker("destroy");
        this.filterFCPercentile?.selectpicker("destroy");
        this.filterFCScenario?.selectpicker("destroy");
        this.refFutureClimate.empty().attr("href", this.refFutureClimateLink).html(this.refFutureClimateLink);
        this.loadData();
    }

    loadData = () => {
        Promise.all([
            this.loadHtmlFile(this.templateClimateRiskProfile),
            this.loadHtmlFile(this.templateClimateRiskVisualizer),
            this.loadHtmlFile(this.templateClimateSectorialImpact),
            this.loadExcelFile("futureclimate_timeseries.xlsx")
        ])
            .then(([riskProfileData, riskVisualizerData, sectorialImpactData, timeseriesData]) => {

                this.tabClimateRiskProfile.empty().html(riskProfileData);
                this.tabClimateRiskVisualizer.empty().html(riskVisualizerData);
                this.tabClimateSectorialImpact.empty().html(sectorialImpactData);

                // excel data to json
                [this.temperatureData, this.actualPrecipitationData, this.precipitationData]
                    = this.excelToArray(timeseriesData, 'ECV - Tempurature', 'ECV-Precipitation', 'Precipitation');
                // filter - province
                let provinceOptionsHtml = this.locations.map(a => `<option value="${a}">${a}</option>`).join("\n");
                this.filterFCProvince.empty().html(provinceOptionsHtml);
                this.filterFCProvince.selectpicker(this.selectpickerCommonOptions);
                // filter variable
                this.tempVariables = ["Mean", "Min", "Max"];
                this.precVariables = this.uqArray(this.precipitationData.map(a => a["Precipitation"]));
                let variableOptionsHtml = `
                    <optgroup label="Temperature">${this.tempVariables.map(a => `<option value="${a}">${a}</option>`).join("\n")}</optgroup>
                    <optgroup label="Precipitation">
                        <option value="Precipitation">Precipitation</option>
                        ${this.precVariables.map(a => `<option value="${a}">${a}</option>`).join("\n")}
                    </optgroup>
                `;
                this.filterFCVariable.empty().html(variableOptionsHtml);
                this.filterFCVariable.selectpicker(this.selectpickerCommonOptions);
                // filter - percentile
                let percentileOptionsHtml = this.percentiles.map(a => `<option value="${a}">${a}</option>`).join("\n");
                this.filterFCPercentile.empty().html(percentileOptionsHtml);
                this.filterFCPercentile.selectpicker(this.selectpickerCommonOptions);
                this.filterFCPercentile.selectpicker("selectAll").selectpicker("refresh");
                // filter - scenario
                let scenarioOptionsHtml = this.scenarios.map(a => `<option value="${a}">${a}</option>`).join("\n");
                this.filterFCScenario.empty().html(scenarioOptionsHtml);
                this.filterFCScenario.selectpicker(this.selectpickerCommonOptions);
                this.filterFCScenario.selectpicker("selectAll").selectpicker("refresh");
            })
            .then(() => {
                // 1st, 2nd and 4th tabs
                this.plotRiskVisualizerChart('climate_risk_visualizer', 'Climate Risk Visualizer', [4.3], 'Medium');
                this.plotRiskVisualizerChart('hazard_and_exposure', 'Hazard & Exposure', [2.2], 'Low');
                this.plotRiskVisualizerChart('vulnerability_guage', 'Vulnerability', [6.0], 'Medium');
                this.plotRiskVisualizerChart('lack_of_coping_capacity', 'Lack of Coping Capacity', [5.9], 'Medium');

                // events - province change
                this.filterFCProvince.on("change", this.refreshClimateData);
                // events - variable change
                this.filterFCVariable.on("change", this.refreshClimateData);
                // events - percentile change
                this.filterFCPercentile.on("change", () => {
                    this.selectedPercentiles = this.filterFCPercentile.selectpicker("val");
                    this.refreshClimateData();
                });
                // events - scenario change
                this.filterFCScenario.on("change", () => {
                    this.selectedScenarios = this.filterFCScenario.selectpicker("val");
                    this.refreshClimateData();
                });
            })
            .then(() => {
                this.selectedPercentiles = Object.assign([], this.percentiles);
                this.selectedScenarios = Object.assign([], this.scenarios);
            })
            .then(() => this.filterFCProvince.trigger("change"))
            .catch(err => {
                this.pageAlert("Unable to load data, check console for details", 0);
                console.error(err);
            })
            .finally(() => this.stopWaiting())
    }

    plotRiskVisualizerChart = (chartId, title, data, valueSuffix) => {
        Highcharts.chart(chartId, {
            chart: { type: 'gauge', backgroundColor: 'transparent' },
            title: { text: null },
            pane: { startAngle: -90, endAngle: 89.9, background: null, center: ['50%', '85%'], size: '120%' },
            exporting: { enabled: false },
            credits: { enabled: false },
            yAxis: {
                min: 0, max: 10, tickPixelInterval: 72, tickPosition: 'inside', tickColor: Highcharts.defaultOptions.chart.backgroundColor || '#FFFFFF',
                tickLength: 0, tickWidth: 2, minorTickInterval: null, labels: { distance: 20 }, lineWidth: 0,
                plotBands: [
                    { from: 0, to: 2, color: '#28a83d', thickness: 50 },
                    { from: 2, to: 4, color: '#80c32b', thickness: 50 },
                    { from: 4, to: 6, color: '#ffdb0f', thickness: 50 },
                    { from: 6, to: 8, color: '#ef7e08', thickness: 50 },
                    { from: 8, to: 10, color: '#e22d03', thickness: 50 }
                ]
            },
            series: [{
                name: title,
                data: data,
                tooltip: { valueSuffix: valueSuffix },
                dataLabels: { format: '{y}', y: 100, borderWidth: 0, style: { fontSize: '19px' } },
                dial: { radius: '80%', backgroundColor: '#000000', baseWidth: 12, baseLength: '0%', rearLength: '0%' },
                pivot: { backgroundColor: '#000000', radius: 6 }
            }]
        });
    };

    refreshClimateData = () => {
        let selectedProvince = this.filterFCProvince.val();
        let selectedVariable = this.filterFCVariable.val();
        let selectedPercentiles = this.selectedPercentiles;
        let selectedScenarios = this.selectedScenarios;

        // console.log(selectedProvince, selectedVariable, selectedPercentiles, selectedScenarios);
        let dataset = selectedVariable == "Precipitation" ? this.actualPrecipitationData
            : this.precVariables.includes(selectedVariable) ? this.precipitationData
                : this.tempVariables.includes(selectedVariable) ? this.temperatureData
                    : null;
        let variableHeader = selectedVariable == "Precipitation" ? "Essential Climate Variable"
            : this.precVariables.includes(selectedVariable) ? "Precipitation"
                : this.tempVariables.includes(selectedVariable) ? "Tempurature Range"
                    : null;

        if (dataset && variableHeader) {
            let provinceDataset = dataset.filter(a =>
                a[variableHeader] == selectedVariable &&
                selectedScenarios.includes(a["SCENARIO"])
            ).map(a => {
                return {
                    "year": a["Year"],
                    "percentile": a["Precentages"].replace(/ /g, ""),
                    "scenario": a["SCENARIO"],
                    "value": a[selectedProvince]
                }
            })
            let baselineDataset = provinceDataset.filter(a => a.year <= this.baselineYear);
            let p10Arr = baselineDataset.filter(b => b.percentile == "10th").map(b => b.value);
            let p50Arr = baselineDataset.filter(b => b.percentile == "50th").map(b => b.value);
            let p90Arr = baselineDataset.filter(b => b.percentile == "90th").map(b => b.value);
            let baselineAverages = {
                "p10Avg": this.sumArray(p10Arr) / (p10Arr.length),
                "p50Avg": this.sumArray(p50Arr) / (p50Arr.length),
                "p90Avg": this.sumArray(p90Arr) / (p90Arr.length),
            };

            // BASELINE (TILL 2014)
            let histYears = this.uqArray(provinceDataset.filter(a => a.year <= this.baselineYear).map(a => a.year));
            histYears.sort((x, y) => x > y ? 0 : -1);
            let histData = histYears.length
                ? histYears.map((a, i) => {
                    let yearsData = baselineDataset.filter(b => b.year == a);
                    let p10Curr = yearsData.find(c => c.percentile == "10th")?.value || 0;
                    let p50Curr = yearsData.find(c => c.percentile == "50th")?.value || 0;
                    let p90Curr = yearsData.find(c => c.percentile == "90th")?.value || 0;
                    // return { "year": a, "arearange": [i, p10Curr - baselineAverages.p10Avg, p90Curr - baselineAverages.p90Avg], "line": p50Curr - baselineAverages.p50Avg };
                    return { "year": a, "arearange": [i, p10Curr, p90Curr], "line": p50Curr };
                }).flat() : [];

            let histChartData = histData.length
                ? [
                    {
                        "type": "line",
                        "name": `Historic (Medium)`,
                        "percentile": "50th",
                        "data": histData.map(a => [Date.UTC(a.year, 0, 1), a.line]),
                        "color": "black",
                        "showInLegend": true,
                        "gapSize": 0
                    },
                    {
                        "type": "arearange",
                        "name": `Historic (Low-High)`,
                        "percentile": "10th-90th",
                        "data": histData.map(a => [Date.UTC(a.year, 0, 1), a.arearange[1], a.arearange[2]]),
                        "color": "black",
                        "opacity": 1 / 3,
                        "showInLegend": true,
                        "gapSize": 0
                    }
                ] : [];

            // TREND (FROM 2015)
            let forecastDataset = provinceDataset.filter(a => a.year >= this.baselineYear);
            let years = this.uqArray(forecastDataset.map(a => a.year));
            years.sort((x, y) => x > y ? 0 : -1);



            let forecastData = years.length
                ? years.map((a, i) => {
                    let yearsData = forecastDataset.filter(b => selectedScenarios.includes(b.scenario) && b.year == a);
                    let scenarioWiseData = selectedScenarios.map(b => {
                        let yearScenarioData = yearsData.filter(c => c.scenario == b);
                        if (yearScenarioData.length) {
                            let p10Curr = yearScenarioData.find(c => c.percentile == "10th")?.value || 0;
                            let p50Curr = yearScenarioData.find(c => c.percentile == "50th")?.value || 0;
                            let p90Curr = yearScenarioData.find(c => c.percentile == "90th")?.value || 0;
                            // return { "year": a, "scenario": b, "arearange": [i, p10Curr - baselineAverages.p10Avg, p90Curr - baselineAverages.p90Avg], "line": p50Curr - baselineAverages.p50Avg };
                            return { "year": a, "scenario": b, "arearange": [i, p10Curr, p90Curr], "line": p50Curr };
                        } else return null;
                    }).filter(Boolean)
                    return scenarioWiseData
                }).flat() : [];

            let forecastChartData = (selectedScenarios.length && forecastData.length)
                ? selectedScenarios.map((a, i) => {
                    return [
                        {
                            "type": "line",
                            "name": `${a} (Medium)`,
                            "percentile": "50th",
                            "data": forecastData.filter(b => b.scenario == a).map(b => [Date.UTC(b.year, 0, 1), b.line]),
                            "color": this.scenarioColorIndex[a],
                            "showInLegend": true,
                            "gapSize": 0
                        },
                        {
                            "type": "arearange",
                            "name": `${a} (Low-High)`,
                            "percentile": "10th-90th",
                            "data": forecastData.filter(b => b.scenario == a).map(b => [Date.UTC(b.year, 0, 1), b.arearange[1], b.arearange[2]]),
                            "color": this.scenarioColorIndex[a],
                            "opacity": 1 / 3,
                            "showInLegend": true,
                            "gapSize": 0
                        }
                    ]
                }) : [];



            let yAxis = { title: { text: selectedVariable } };
            let chartData = [...histChartData, ...forecastChartData].flat();
            if (chartData.length && selectedPercentiles.length && selectedScenarios.length) {
                chartData = chartData.filter(a => selectedPercentiles.includes(a.percentile))
            } else chartData = [];
            this.plotChart(chartData, "chart-future-climate", yAxis);
        } 
        // else {
        //     this.pageAlert("Error in reading dataset, please check", 0);
        // }

    }

    plotChart = (chartData, container, yAxis) => {
        $(`div#${container}`).empty();
        $(`div#${container}-legend`).empty();
        if (chartData.length) {
            Highcharts.chart(container, {
                title: { text: null },
                credits: { enabled: false },
                exporting: { enabled: true },
                legend: { enabled: false },
                xAxis: {
                    type: 'datetime',
                    plotLines: [{
                        color: 'black',
                        width: 2,
                        value: Date.UTC(2015, 0, 1)
                    }],
                    gapSize: 0
                },
                yAxis: {
                    ...yAxis, plotLines: [{
                        value: 0,
                        color: 'black',
                        width: 2,
                        zIndex: 4
                    }],
                },
                tooltip: { shared: true, valueDecimals: 2 },
                plotOptions: {
                    "arearange": { marker: { enabled: false }, states: { hover: { enabled: false } }, events: { legendItemClick: function () { return false } }, gapSize: 0 },
                    "line": { marker: { enabled: false }, states: { hover: { enabled: false } }, events: { legendItemClick: function () { return false } }, gapSize: 0 },
                },

                series: chartData
            });

            let lineSeries = chartData.filter(a => a.type == "line");
            let arearangeSeries = chartData.filter(a => a.type == "arearange");

            if (lineSeries.length) {
                let lineSeriesLegend = `<div class="text-center">${lineSeries.map(a => `
                    <span class="mx-3" style="color:black; display: inline-block;">
                        <div style="background-color:${a.color}; width: 10px; height: 2px; display: inline-block; vertical-align: middle;"></div>
                        ${a.name}
                    </span>`).join("")}</div>`;
                $(`div#${container}-legend`).append(lineSeriesLegend);
            }

            if (arearangeSeries.length) {
                let arearangeSeriesLegend = `<div class="text-center">${arearangeSeries.map(a => `
                    <span class="mx-3" style="color:black; display: inline-block;">
                        <div style="background-color:${a.color}; width: 10px; height: 10px; border-radius: 50%; display: inline-block;"></div>
                        ${a.name}
                    </span>`).join("")}</div>`;
                $(`div#${container}-legend`).append(arearangeSeriesLegend);
            }

        } else $(`div#${container}`).empty().html(`<div class="mt-5 text-center">No data available</div>`)
    }

    loadHtmlFile = (fileName) => new Promise((resolve, reject) => {
        $.ajax({
            "type": "GET",
            "url": `./assets/data/zambia/${fileName}`,
            "success": response => resolve(response),
            "error": err => reject(err)
        });
    })


    loadExcelFile = (fileName) => new Promise((resolve, reject) => {
        this.startWaiting()
        fetch(`./assets/data/zambia/${fileName}`).then(res => res.blob()).then(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const bstr = e.target.result;
                resolve(bstr)
            }
            reader.readAsBinaryString(file);
        }).catch(err => reject(err))
    });


    excelToArray = (file, ...sheets) => {
        let wb = XLSX.read(file, { type: 'binary' });
        return sheets.map(sheet => {
            let rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, raw: false });
            let header = rows[0];
            let body = rows.slice(1,);
            let data = body.map(a => {
                let result = {};
                header.forEach((b, i) => result[b] = ["NULL", undefined, null].includes(a[i]) ? null : (isNaN(a[i]) ? a[i].replace(/\"/g, "") : this.num(a[i])));
                return result;
            });
            return data;
        })
    }

    uqArray = (arr) => [...new Set(arr)];
    sumArray = (arr) => arr.reduce((a, b) => a + b, 0);
    num = (val) => !isNaN(val) ? parseFloat(val) : 0;

    zfill = (number, width) => {
        const numString = String(number);
        const padding = width - numString.length > 0 ? width - numString.length : 0;
        return '0'.repeat(padding) + numString;
    };

    startWaiting = () => {
        let loadingIcon = `<div class="text-center"><div class="fa-3x mb-1"><i class="fa fa-spinner fa-pulse" aria-hidden="true"></i></div><span>Loading</span></div>`;
        $("#loading-modal-container").empty().html(loadingIcon);
        $('#loading-modal').modal('show');
    }

    stopWaiting = () => {
        $("#loading-modal-container").empty();
        $("#loading-modal").modal("hide");
    }

    pageAlert = (text, success) => {
        let alertIcon = success !== null || success !== undefined
            ? (success 
                ? `<img src="assets/images/success.png"><h5 class="success-text-popup my-2">SUCCESS!</h5>`
                : `<img src="assets/images/success-false.png"><h5 class="success-text-popup my-2">ERROR!</h5>`)
            : "";
        $("div#icon-alert-modal").empty().html(alertIcon);
        $("h5#text-alert-modal").empty().html(text);
        $("div.modal#alertModal").modal("show");
    }
}

class SrilankaClimateOutlook {
    constructor() {
        this.locations = [
            "Sri Lanka",
            "Central", "Eastern", "North Central",
            "North Western", "Northern",
            "Sabaragamuwa", "Southern", "Uva", "Western"
        ]; // change this if countries are different

        // filters
        this.filterFCProvince = $("select#filter-future-climate-province");
        this.filterFCVariable = $("select#filter-future-climate-variable");
        this.percentiles = ["50th", "10th-90th",];
        this.selectedPercentiles = [];
        this.filterFCPercentile = $("select#filter-future-climate-percentile");
        this.filterFCScenario = $("select#filter-future-climate-scenario");
        this.scenarioColorIndex = {
            "historical": "black",
            // "SSP-1.9": "blue",
            "SSP-2.6": "green",
            "SSP-4.5": "yellow",
            "SSP-7.0": "orange",
            "SSP-8.5": "red"
        }
        this.scenarios = Object.keys(this.scenarioColorIndex);
        this.selectedScenarios = [];

        this.tempVariables = [];
        this.actualPrecVariable = "Precipitation";
        this.precVariables = [];

        this.selectpickerCommonOptions = {
            actionsBox: true,
            liveSearch: true,
            selectedTextFormat: "count > 1",
            size: 5,
        };

        this.temperatureData = [];
        this.actualPrecipitationData = [];
        this.precipitationData = [];
        this.baselineYear = 2014;

        this.percentileValues = {
            "50th": "Medium",
            "10th-90th": "Low-High"
        };
        this.refFutureClimate = $("a#reference-fc");
        this.refFutureClimateLink = "https://climateknowledgeportal.worldbank.org/country/sri-lanka/climate-data-projections";

        // 1st, 2nd and 4th tabs
        this.tabClimateRiskProfile = $("div#content-climate-risk-profile");
        this.tabClimateRiskVisualizer = $("div#content-climate-risk-visualizer");
        this.tabClimateSectorialImpact = $("div#content-sectorial-climate-impact");
        this.templateClimateRiskProfile = "srilanka_climate_risk_profile.html";
        this.templateClimateRiskVisualizer = "srilanka_climate_risk_visualizer.html";
        this.templateClimateSectorialImpact = "srilanka_sectorial_climate_impact.html";
    }

    init = () => {
        this.filterFCProvince?.selectpicker("destroy");
        this.filterFCVariable?.selectpicker("destroy");
        this.filterFCPercentile?.selectpicker("destroy");
        this.filterFCScenario?.selectpicker("destroy");
        this.refFutureClimate.empty().attr("href", this.refFutureClimateLink).html(this.refFutureClimateLink);
        this.loadData();
    }

    loadData = () => {
        Promise.all([
            this.loadHtmlFile(this.templateClimateRiskProfile),
            this.loadHtmlFile(this.templateClimateRiskVisualizer),
            this.loadHtmlFile(this.templateClimateSectorialImpact),
            this.loadExcelFile("futureclimate_timeseries.xlsx")
        ])
            .then(([riskProfileData, riskVisualizerData, sectorialImpactData, timeseriesData]) => {
                this.tabClimateRiskProfile.empty().html(riskProfileData);
                this.tabClimateRiskVisualizer.empty().html(riskVisualizerData);
                this.tabClimateSectorialImpact.empty().html(sectorialImpactData);
                // excel data to json
                [this.temperatureData, this.actualPrecipitationData, this.precipitationData]
                    = this.excelToArray(timeseriesData, 'ECV-Temperature', 'ECV-precipitation', 'Precipitation');
                // filter - province
                let provinceOptionsHtml = this.locations.map(a => `<option value="${a}">${a}</option>`).join("\n");
                this.filterFCProvince.empty().html(provinceOptionsHtml);
                this.filterFCProvince.selectpicker(this.selectpickerCommonOptions);
                // filter variable
                this.tempVariables = ["Mean", "Min", "Max"];
                this.precVariables = this.uqArray(this.precipitationData.map(a => a["Precipitation"]));
                let variableOptionsHtml = `
                    <optgroup label="Temperature">${this.tempVariables.map(a => `<option value="${a}">${a}</option>`)}</optgroup>
                    <optgroup label="Precipitation">
                        <option value="Precipitation">Precipitation</option>
                        ${this.precVariables.map(a => `<option value="${a}">${a}</option>`).join("\n")}
                    </optgroup>
                `;
                this.filterFCVariable.empty().html(variableOptionsHtml);
                this.filterFCVariable.selectpicker(this.selectpickerCommonOptions);
                // filter - percentile
                let percentileOptionsHtml = this.percentiles.map(a => `<option value="${a}">${a}</option>`).join("\n");
                this.filterFCPercentile.empty().html(percentileOptionsHtml);
                this.filterFCPercentile.selectpicker(this.selectpickerCommonOptions);
                this.filterFCPercentile.selectpicker("selectAll").selectpicker("refresh");
                // filter - scenario
                let scenarioOptionsHtml = this.scenarios.map(a => `<option value="${a}">${a}</option>`).join("\n");
                this.filterFCScenario.empty().html(scenarioOptionsHtml);
                this.filterFCScenario.selectpicker(this.selectpickerCommonOptions);
                this.filterFCScenario.selectpicker("selectAll").selectpicker("refresh");
            })
            .then(() => {
                // 1st, 2nd and 4th tabs
                this.plotRiskVisualizerChart('climate_risk_visualizer', 'Climate Risk Visualizer', 3.3, 'Medium', '0%');
                this.plotRiskVisualizerChart('hazard_and_exposure', 'Hazard & Exposure', 3.3, 'Low', '0%');
                this.plotRiskVisualizerChart('vulnerability_guage', 'Vulnerability', 2.7, 'Medium', '0%');
                this.plotRiskVisualizerChart('lack_of_coping_capacity', 'Lack of Coping Capacity', 4.0, 'Medium', '0%');
                // events - province change
                this.filterFCProvince.on("change", this.refreshClimateData);
                // events - variable change
                this.filterFCVariable.on("change", this.refreshClimateData);
                // events - percentile change
                this.filterFCPercentile.on("change", () => {
                    this.selectedPercentiles = this.filterFCPercentile.selectpicker("val");
                    this.refreshClimateData();
                });
                // events - scenario change
                this.filterFCScenario.on("change", () => {
                    this.selectedScenarios = this.filterFCScenario.selectpicker("val");
                    this.refreshClimateData();
                });
            })
            .then(() => {
                this.selectedPercentiles = Object.assign([], this.percentiles);
                this.selectedScenarios = Object.assign([], this.scenarios);
            })
            .then(() => this.filterFCProvince.trigger("change"))
            .catch(err => {
                this.pageAlert("Unable to load map, check console for details", 0);
                console.error(err);
            })
            .finally(() => this.stopWaiting())
    }

    plotRiskVisualizerChart = (chartId, name, dataValue, valueSuffix, baseLength) => {
        return Highcharts.chart(chartId, {
            chart: { type: 'gauge', backgroundColor: 'transparent' },
            title: { text: '' },
            pane: { startAngle: -90, endAngle: 89.9, background: null, center: ['50%', '85%'], size: '120%' },
            exporting: { enabled: false },
            credits: { enabled: false },
            yAxis: {
                min: 0, max: 10, tickPixelInterval: 72, tickPosition: 'inside',
                tickColor: Highcharts.defaultOptions.chart.backgroundColor || '#FFFFFF', tickLength: 0, tickWidth: 2,
                minorTickInterval: null, labels: { distance: 20 }, lineWidth: 0,
                plotBands: [
                    { from: 0, to: 2, color: '#28a83d', thickness: 50 },
                    { from: 2, to: 4, color: '#80c32b', thickness: 50 },
                    { from: 4, to: 6, color: '#ffdb0f', thickness: 50 },
                    { from: 6, to: 8, color: '#ef7e08', thickness: 50 },
                    { from: 8, to: 10, color: '#e22d03', thickness: 50 }
                ]
            },
            series: [{
                name: name,
                data: [dataValue],
                tooltip: { valueSuffix: valueSuffix },
                dataLabels: { format: '{y}', y: 100, borderWidth: 0, style: { fontSize: '19px' } },
                dial: { radius: '80%', backgroundColor: '#000000', baseWidth: 12, baseLength: baseLength, rearLength: '0%' },
                pivot: { backgroundColor: '#000000', radius: 6 }
            }]
        });
    };

    refreshClimateData = () => {
        let selectedProvince = this.filterFCProvince.val();
        let selectedVariable = this.filterFCVariable.val();
        let selectedPercentiles = this.selectedPercentiles;
        let selectedScenarios = this.selectedScenarios;

        // console.log(selectedProvince, selectedVariable, selectedPercentiles, selectedScenarios);
        let dataset = selectedVariable == "Precipitation" ? this.actualPrecipitationData
            : this.precVariables.includes(selectedVariable) ? this.precipitationData
                : this.tempVariables.includes(selectedVariable) ? this.temperatureData
                    : null;
        let variableHeader = selectedVariable == "Precipitation" ? "Essential Climate Variable"
            : this.precVariables.includes(selectedVariable) ? "Precipitation"
                : this.tempVariables.includes(selectedVariable) ? "Tempurature Range"
                    : null;

        if (dataset && variableHeader) {
            let provinceDataset = dataset.filter(a =>
                a[variableHeader] == selectedVariable &&
                selectedScenarios.includes(a["SCENARIO"])
            ).map(a => {
                return {
                    "year": a["Year"],
                    "percentile": a["Precentages"].replace(/ /g, ""),
                    "scenario": a["SCENARIO"],
                    "value": a[selectedProvince]
                }
            })
            let baselineDataset = provinceDataset.filter(a => a.scenario == "historical");

            let histYears = this.uqArray(provinceDataset.filter(a => a.scenario == "historical").map(a => a.year));
            histYears.sort((x, y) => x > y ? 0 : -1);
            let histData = histYears.length
                ? histYears.map((a, i) => {
                    let yearsData = baselineDataset.filter(b => b.year == a && b.scenario == "historical");
                    let p10Curr = yearsData.find(c => c.percentile == "10th")?.value || 0;
                    let p50Curr = yearsData.find(c => c.percentile == "50th")?.value || 0;
                    let p90Curr = yearsData.find(c => c.percentile == "90th")?.value || 0;
                    return { "year": a, "arearange": [i, p10Curr, p90Curr], "line": p50Curr };
                }).flat() : [];
            let histChartData = histData.length
                ? [
                    {
                        "type": "line",
                        "name": `historical (Medium)`,
                        "percentile": "50th",
                        "data": histData.map(a => [Date.UTC(a.year, 0, 1), a.line]),
                        "color": "black",
                        "showInLegend": true,
                        "gapSize": 0
                    },
                    {
                        "type": "arearange",
                        "name": `historical (Low-High)`,
                        "percentile": "10th-90th",
                        "data": histData.map(a => [Date.UTC(a.year, 0, 1), a.arearange[1], a.arearange[2]]),
                        "color": "black",
                        "opacity": 1 / 3,
                        "showInLegend": true,
                        "gapSize": 0
                    }
                ] : [];


            // TREND (FROM 2015)
            let forecastDataset = provinceDataset.filter(a => a.scenario != "historical");
            let years = this.uqArray(forecastDataset.map(a => a.year));
            years.sort((x, y) => x > y ? 0 : -1);


            let forecastData = years.length
                ? years.map((a, i) => {
                    let yearsData = forecastDataset.filter(b => selectedScenarios.includes(b.scenario) && b.scenario != "historical" && b.year == a);
                    let scenarioWiseData = selectedScenarios.map(b => {
                        let yearScenarioData = yearsData.filter(c => c.scenario == b);
                        if (yearScenarioData.length) {
                            let p10Curr = yearScenarioData.find(c => c.percentile == "10th")?.value || 0;
                            let p50Curr = yearScenarioData.find(c => c.percentile == "50th")?.value || 0;
                            let p90Curr = yearScenarioData.find(c => c.percentile == "90th")?.value || 0;
                            // return { "year": a, "scenario": b, "arearange": [i, p10Curr-baselineAverages.p10Avg, p90Curr-baselineAverages.p90Avg], "line": p50Curr-baselineAverages.p50Avg};
                            return { "year": a, "scenario": b, "arearange": [i, p10Curr, p90Curr], "line": p50Curr };
                        } else return null;
                    }).filter(Boolean)
                    return scenarioWiseData
                }).flat() : [];

            let forecastChartData = (selectedScenarios.length && forecastData.length)
                ? selectedScenarios.map((a, i) => {
                    return [
                        {
                            "type": "line",
                            "name": `${a} (Medium)`,
                            "percentile": "50th",
                            "data": forecastData.filter(b => b.scenario == a).map(b => [Date.UTC(b.year, 0, 1), b.line]),
                            "color": this.scenarioColorIndex[a],
                            "showInLegend": true,
                            "gapSize": 0
                        },
                        {
                            "type": "arearange",
                            "name": `${a} (Low-High)`,
                            "percentile": "10th-90th",
                            "data": forecastData.filter(b => b.scenario == a).map(b => [Date.UTC(b.year, 0, 1), b.arearange[1], b.arearange[2]]),
                            "color": this.scenarioColorIndex[a],
                            "opacity": 1 / 3,
                            "showInLegend": true,
                            "gapSize": 0
                        }
                    ]
                }) : [];


            let yAxis = { title: { text: selectedVariable } };
            let chartData = [...histChartData, ...forecastChartData].flat();
            if (chartData.length && selectedPercentiles.length && selectedScenarios.length) {
                chartData = chartData.filter(a => selectedPercentiles.includes(a.percentile))
            } else chartData = [];
            this.plotChart(chartData, "chart-future-climate", yAxis);
        } 
        // else {
        //     this.pageAlert("Error in reading dataset, please check", 0)
        // }

    }

    plotChart = (chartData, container, yAxis) => {
        $(`div#${container}`).empty();
        $(`div#${container}-legend`).empty();
        if (chartData.length) {
            Highcharts.chart(container, {
                title: { text: null },
                credits: { enabled: false },
                exporting: { enabled: true },
                legend: { enabled: false },
                xAxis: {
                    type: 'datetime',
                    plotLines: [{
                        color: 'black',
                        width: 2,
                        value: Date.UTC(2015, 0, 1)
                    }],
                    gapSize: 0
                },
                yAxis: {
                    ...yAxis, plotLines: [{
                        value: 0,
                        color: 'black',
                        width: 2,
                        zIndex: 4
                    }],
                },
                tooltip: { shared: true, valueDecimals: 2 },
                plotOptions: {
                    "arearange": { marker: { enabled: false }, states: { hover: { enabled: false } }, events: { legendItemClick: function () { return false } }, gapSize: 0 },
                    "line": { marker: { enabled: false }, states: { hover: { enabled: false } }, events: { legendItemClick: function () { return false } }, gapSize: 0 },
                },

                series: chartData
            });

            let lineSeries = chartData.filter(a => a.type == "line");
            let arearangeSeries = chartData.filter(a => a.type == "arearange");

            if (lineSeries.length) {
                let lineSeriesLegend = `<div class="text-center">${this.uqArray(lineSeries.map(a => `
                    <span class="mx-3" style="color:black; display: inline-block;">
                        <div style="background-color:${a.color}; width: 10px; height: 2px; display: inline-block; vertical-align: middle;"></div>
                        ${a.name}
                    </span>`)).join("")}</div>`;
                $(`div#${container}-legend`).append(lineSeriesLegend);
            }

            if (arearangeSeries.length) {
                let arearangeSeriesLegend = `<div class="text-center">${this.uqArray(arearangeSeries.map(a => `
                    <span class="mx-3" style="color:black; display: inline-block;">
                        <div style="background-color:${a.color}; width: 10px; height: 10px; border-radius: 50%; display: inline-block;"></div>
                        ${a.name}
                    </span>`)).join("")}</div>`;
                $(`div#${container}-legend`).append(arearangeSeriesLegend);
            }

        } else $(`div#${container}`).empty().html(`<div class="mt-5 text-center">No data available</div>`)
    }

    loadHtmlFile = (fileName) => new Promise((resolve, reject) => {
        $.ajax({
            "type": "GET",
            "url": `./assets/data/srilanka/${fileName}`,
            "success": response => resolve(response),
            "error": err => reject(err)
        });
    });


    loadExcelFile = (fileName) => new Promise((resolve, reject) => {
        this.startWaiting()
        fetch(`./assets/data/srilanka/${fileName}`).then(res => res.blob()).then(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const bstr = e.target.result;
                resolve(bstr)
            }
            reader.readAsBinaryString(file);
        }).catch(err => reject(err))
    });


    excelToArray = (file, ...sheets) => {
        let wb = XLSX.read(file, { type: 'binary' });
        return sheets.map(sheet => {
            let rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, raw: false });
            let header = rows[0];
            let body = rows.slice(1,);
            let data = body.map(a => {
                let result = {};
                header.forEach((b, i) => result[b] = ["NULL", undefined, null].includes(a[i]) ? null : (isNaN(a[i]) ? a[i].replace(/\"/g, "") : this.num(a[i])));
                return result;
            });
            return data;
        })
    }

    uqArray = (arr) => [...new Set(arr)];
    sumArray = (arr) => arr.reduce((a, b) => a + b, 0);
    num = (val) => !isNaN(val) ? parseFloat(val) : 0;

    zfill = (number, width) => {
        const numString = String(number);
        const padding = width - numString.length > 0 ? width - numString.length : 0;
        return '0'.repeat(padding) + numString;
    };

    startWaiting = () => {
        let loadingIcon = `<div class="text-center"><div class="fa-3x mb-1"><i class="fa fa-spinner fa-pulse" aria-hidden="true"></i></div><span>Loading</span></div>`;
        $("#loading-modal-container").empty().html(loadingIcon);
        $('#loading-modal').modal('show');
    }

    stopWaiting = () => {
        $("#loading-modal-container").empty();
        $("#loading-modal").modal("hide");
    }

    pageAlert = (text, success) => {
        let alertIcon = success !== null || success !== undefined
            ? (success 
                ? `<img src="assets/images/success.png"><h5 class="success-text-popup my-2">SUCCESS!</h5>`
                : `<img src="assets/images/success-false.png"><h5 class="success-text-popup my-2">ERROR!</h5>`)
            : "";
        $("div#icon-alert-modal").empty().html(alertIcon);
        $("h5#text-alert-modal").empty().html(text);
        $("div.modal#alertModal").modal("show");
    }
}

class SenegalClimateOutlook{
    constructor(){
        this.locations = [
            "Senegal",
            "Dakar", "Diourbel", "Fatick", "Kaffrine", 
            "Kaolack", "Kédougou", "Kolda", "Louga", 
            "Matam", "Saint-Louis", "Sédhiou", "Tambacounda", 
            "Thiès", "Ziguinchor"
        ];

        // filters
        this.filterFCProvince = $("select#filter-future-climate-province");
        this.filterFCVariable = $("select#filter-future-climate-variable");
        this.filterFCPercentile = $("select#filter-future-climate-percentile");
        this.percentiles = ["50th", "10th-90th",];
        this.selectedPercentiles = [];
        this.filterFCScenario = $("select#filter-future-climate-scenario");
        this.scenarioColorIndex = {
            "Historical": "black",
            // "SSP-1.9": "blue",
            "SSP1-2.6": "green",
            "SSP2-4.5": "yellow",
            "SSP3-7.0": "orange",
            "SSP5-8.5": "red"
        }
        this.scenarios = Object.keys(this.scenarioColorIndex);
        this.selectedScenarios = [];

        this.tempVariables = [];
        this.actualPrecVariable = "Precipitation";
        this.precVariables = [];

        this.temperatureData = [];
        this.actualPrecipitationData = [];
        this.precipitationData = [];
        this.baselineYear = 2015;

        this.percentileValues = {
            "50th": "Medium",
            "10th-90th": "Low-High"
        };
        this.refFutureClimate = $("a#reference-fc");
        this.refFutureClimateLink = "https://climateknowledgeportal.worldbank.org/country/senegal/climate-data-projections";

        // 1st, 2nd and 4th tabs
        this.tabClimateRiskProfile = $("div#content-climate-risk-profile");
        this.tabClimateRiskVisualizer = $("div#content-climate-risk-visualizer");
        this.tabClimateSectorialImpact = $("div#content-sectorial-climate-impact");
        this.templateClimateRiskProfile = "senegal_climate_risk_profile.html";
        this.templateClimateRiskVisualizer = "senegal_climate_risk_visualizer.html";
        this.templateClimateSectorialImpact = "senegal_sectorial_climate_impact.html";

        
        this.meanTempData = [];
        this.maxTempData = [];
        this.minTempData = [];
        this.pcpData = [];
        this.pcp1DayData = [];
        this.pcp5DayData = [];
        this.pcp20mmData = [];
        this.pcp50mmData = [];

        this.paramIndex = {
            "Mean": this.meanTempData,
            "Min": this.minTempData,
            "Max": this.maxTempData,
            "Precipitation": this.pcpData,
            "Average 1 day precipitation": this.pcp1DayData,
            "Average 5 day precipitation": this.pcp5DayData,
            "Days with 20mm precipitation": this.pcp20mmData,
            "Days with 50mm precipitation": this.pcp50mmData,
        };
        this.selectpickerCommonOptions = {
            actionsBox: true,
            liveSearch: true,
            selectedTextFormat: "count > 1",
            size: 5,
        };

    }

    init = () => {
        this.filterFCProvince?.selectpicker("destroy");
        this.filterFCVariable?.selectpicker("destroy");
        this.filterFCPercentile?.selectpicker("destroy");
        this.filterFCScenario?.selectpicker("destroy");
        this.refFutureClimate.empty().attr("href", this.refFutureClimateLink).html(this.refFutureClimateLink);
        this.loadData();
    }

    loadData = () => {
        Promise.all([
            this.loadHtmlFile(this.templateClimateRiskProfile),
            this.loadHtmlFile(this.templateClimateRiskVisualizer),
            this.loadHtmlFile(this.templateClimateSectorialImpact),
            this.loadExcelFile("futureclimate_timeseries.xlsx")
        ])
        .then(([riskProfileData, riskVisualizerData, sectorialImpactData, timeseriesData]) => {
            // 1, 2, 4 tabs
            this.tabClimateRiskProfile.empty().html(riskProfileData);
            this.tabClimateRiskVisualizer.empty().html(riskVisualizerData);
            this.tabClimateSectorialImpact.empty().html(sectorialImpactData);
            // 3 tab
            [
                this.paramIndex["Mean"],
                this.paramIndex["Min"],
                this.paramIndex["Max"],
                this.paramIndex["Precipitation"],
                this.paramIndex["Average 1 day precipitation"],
                this.paramIndex["Average 5 day precipitation"],
                this.paramIndex["Days with 20mm precipitation"],
                this.paramIndex["Days with 50mm precipitation"],
            ] = this.excelToArray(
                    timeseriesData, 
                    "Mean_Temperature", "Minimum_Temperature", "Maximum_Temperature", "Precipitation",
                    "Average 1 day PCP", "Average 5 day PCP", "Days with PCP_20mm", "Days with PCP_50mm"
            );
            // filter - province - single
            let filterProvinceHtml = this.locations.map(a => {
                return `<option value="${a}">${a}</option>`;
            }).join("\n");
            this.filterFCProvince.empty().html(filterProvinceHtml);
            this.filterFCProvince.selectpicker(this.selectpickerCommonOptions);
            // filter - parameter - single
            let filterVariableHtml = `
                <optgroup label="Temperature">
                    <option value="Mean">Mean</option>
                    <option value="Min">Min</option>
                    <option value="Max">Max</option>
                </optgroup>
                <optgroup label="Precipitation">
                    <option value="Precipitation">Precipitation</option>
                    <option value="Average 1 day precipitation">Average 1 day precipitation</option>
                    <option value="Average 5 day precipitation">Average 5 day precipitation</option>
                    <option value="Days with 20mm precipitation">Days with 20mm precipitation</option>
                    <option value="Days with 50mm precipitation">Days with 50mm precipitation</option>
                </optgroup>
            `;
            this.filterFCVariable.empty().html(filterVariableHtml);
            this.filterFCVariable.selectpicker(this.selectpickerCommonOptions);
            // filter - percentile
            let percentileOptionsHtml = this.percentiles.map(a => `<option value="${a}">${a}</option>`).join("\n");
            this.filterFCPercentile.empty().html(percentileOptionsHtml);
            this.filterFCPercentile.selectpicker(this.selectpickerCommonOptions);
            this.filterFCPercentile.selectpicker("selectAll").selectpicker("refresh");
            // filter - scenario
            let scenarioOptionsHtml = this.scenarios.map(a => `<option value="${a}">${a}</option>`).join("\n");
            this.filterFCScenario.empty().html(scenarioOptionsHtml);
            this.filterFCScenario.selectpicker(this.selectpickerCommonOptions);
            this.filterFCScenario.selectpicker("selectAll").selectpicker("refresh");
            $("div#chart-future-climate").empty();
        })
        .then(() => {
            this.plotRiskVisualizerChart('climate_risk_visualizer', 'Climate Risk Visualizer', [4.2], 'Medium');
            this.plotRiskVisualizerChart('hazard_and_exposure', 'Hazard & Exposure', [2.6], 'Low');
            this.plotRiskVisualizerChart('vulnerability_guage', 'Vulnerability', [5.0], 'Medium');
            this.plotRiskVisualizerChart('lack_of_coping_capacity', 'Lack of Coping Capacity', [5.5], 'Medium');

            // events - province change
            this.filterFCProvince.on("change", this.refreshClimateData);
            // events - variable change
            this.filterFCVariable.on("change", this.refreshClimateData);
            // events - percentile change
            this.filterFCPercentile.on("change", () => {
                this.selectedPercentiles = this.filterFCPercentile.selectpicker("val");
                this.refreshClimateData();
            });
            // events - scenario change
            this.filterFCScenario.on("change", () => {
                this.selectedScenarios = this.filterFCScenario.selectpicker("val");
                this.refreshClimateData();
            });
        })
        .then(() => {
            this.selectedPercentiles = Object.assign([], this.percentiles);
            this.selectedScenarios = Object.assign([], this.scenarios);
        })
        .then(() => this.filterFCProvince.trigger("change"))
        .catch(err => {
            this.pageAlert("Unable to load data, check console for details", 0);
            console.error(err);
        })
        .finally(() => this.stopWaiting())
    }

    plotRiskVisualizerChart = (chartId, title, data, valueSuffix) => {
        Highcharts.chart(chartId, {
            chart: { type: 'gauge', backgroundColor: 'transparent' },
            title: { text: null },
            pane: { startAngle: -90, endAngle: 89.9, background: null, center: ['50%', '85%'], size: '120%' },
            exporting: { enabled: false },
            credits: { enabled: false },
            yAxis: {
                min: 0, max: 10, tickPixelInterval: 72, tickPosition: 'inside', tickColor: Highcharts.defaultOptions.chart.backgroundColor || '#FFFFFF',
                tickLength: 0, tickWidth: 2, minorTickInterval: null, labels: { distance: 20 }, lineWidth: 0,
                plotBands: [
                    { from: 0, to: 2, color: '#28a83d', thickness: 50 },
                    { from: 2, to: 4, color: '#80c32b', thickness: 50 },
                    { from: 4, to: 6, color: '#ffdb0f', thickness: 50 },
                    { from: 6, to: 8, color: '#ef7e08', thickness: 50 },
                    { from: 8, to: 10, color: '#e22d03', thickness: 50 }
                ]
            },
            series: [{
                name: title,
                data: data,
                tooltip: { valueSuffix: valueSuffix },
                dataLabels: { format: '{y}', y: 100, borderWidth: 0, style: { fontSize: '19px' } },
                dial: { radius: '80%', backgroundColor: '#000000', baseWidth: 12, baseLength: '0%', rearLength: '0%' },
                pivot: { backgroundColor: '#000000', radius: 6 }
            }]
        });
    };

    refreshClimateData = () => {
        let selectedProvince = this.filterFCProvince.val();
        let selectedVariable = this.filterFCVariable.val();
        let selectedPercentiles = this.selectedPercentiles;
        let selectedScenarios = this.selectedScenarios;

        let dataset = this.paramIndex[selectedVariable]

        if (dataset) {
            let provinceDataset = dataset.filter(a =>
                // a[variableHeader] == selectedVariable &&
                selectedScenarios.includes(a["SCENARIO"])
            ).map(a => {
                return {
                    "year": a["Year"],
                    "percentile": a["Percentile"].replace(/ /g, ""),
                    "scenario": a["SCENARIO"],
                    "value": a[selectedProvince]
                }
            })
            let baselineDataset = provinceDataset.filter(a => a.year <= this.baselineYear);
            let p10Arr = baselineDataset.filter(b => b.percentile == "10th").map(b => b.value);
            let p50Arr = baselineDataset.filter(b => b.percentile == "50th").map(b => b.value);
            let p90Arr = baselineDataset.filter(b => b.percentile == "90th").map(b => b.value);
            let baselineAverages = {
                "p10Avg": this.sumArray(p10Arr) / (p10Arr.length),
                "p50Avg": this.sumArray(p50Arr) / (p50Arr.length),
                "p90Avg": this.sumArray(p90Arr) / (p90Arr.length),
            };

            // BASELINE (TILL 2014)
            let histYears = this.uqArray(provinceDataset.filter(a => a.year <= this.baselineYear).map(a => a.year));
            histYears.sort((x, y) => x > y ? 0 : -1);
            let histData = histYears.length
                ? histYears.map((a, i) => {
                    let yearsData = baselineDataset.filter(b => b.year == a);
                    let p10Curr = yearsData.find(c => c.percentile == "10th")?.value || 0;
                    let p50Curr = yearsData.find(c => c.percentile == "50th")?.value || 0;
                    let p90Curr = yearsData.find(c => c.percentile == "90th")?.value || 0;
                    // return { "year": a, "arearange": [i, p10Curr - baselineAverages.p10Avg, p90Curr - baselineAverages.p90Avg], "line": p50Curr - baselineAverages.p50Avg };
                    return { "year": a, "arearange": [i, p10Curr, p90Curr], "line": p50Curr};
                }).flat() : [];

            let histChartData = histData.length
                ? [
                    {
                        "type": "line",
                        "name": `Historic (Medium)`,
                        "percentile": "50th",
                        "data": histData.map(a => [Date.UTC(a.year, 0, 1), a.line]),
                        "color": "black",
                        "showInLegend": true,
                        "gapSize": 0
                    },
                    {
                        "type": "arearange",
                        "name": `Historic (Low-High)`,
                        "percentile": "10th-90th",
                        "data": histData.map(a => [Date.UTC(a.year, 0, 1), a.arearange[1], a.arearange[2]]),
                        "color": "black",
                        "opacity": 1 / 3,
                        "showInLegend": true,
                        "gapSize": 0
                    }
                ] : [];

            // TREND (FROM 2015)
            let forecastDataset = provinceDataset.filter(a => a.year >= this.baselineYear);
            let years = this.uqArray(forecastDataset.map(a => a.year));
            years.sort((x, y) => x > y ? 0 : -1);



            let forecastData = years.length
                ? years.map((a, i) => {
                    let yearsData = forecastDataset.filter(b => selectedScenarios.includes(b.scenario) && b.year == a);
                    let scenarioWiseData = selectedScenarios.map(b => {
                        let yearScenarioData = yearsData.filter(c => c.scenario == b);
                        if (yearScenarioData.length) {
                            let p10Curr = yearScenarioData.find(c => c.percentile == "10th")?.value || 0;
                            let p50Curr = yearScenarioData.find(c => c.percentile == "50th")?.value || 0;
                            let p90Curr = yearScenarioData.find(c => c.percentile == "90th")?.value || 0;
                            // return { "year": a, "scenario": b, "arearange": [i, p10Curr - baselineAverages.p10Avg, p90Curr - baselineAverages.p90Avg], "line": p50Curr - baselineAverages.p50Avg };
                            return { "year": a, "scenario": b, "arearange": [i, p10Curr, p90Curr], "line": p50Curr};
                        } else return null;
                    }).filter(Boolean)
                    return scenarioWiseData
                }).flat() : [];

            let forecastChartData = (selectedScenarios.length && forecastData.length)
                ? selectedScenarios.map((a, i) => {
                    return [
                        {
                            "type": "line",
                            "name": `${a} (Medium)`,
                            "percentile": "50th",
                            "data": forecastData.filter(b => b.scenario == a).map(b => [Date.UTC(b.year, 0, 1), b.line]),
                            "color": this.scenarioColorIndex[a],
                            "showInLegend": true,
                            "gapSize": 0
                        },
                        {
                            "type": "arearange",
                            "name": `${a} (Low-High)`,
                            "percentile": "10th-90th",
                            "data": forecastData.filter(b => b.scenario == a).map(b => [Date.UTC(b.year, 0, 1), b.arearange[1], b.arearange[2]]),
                            "color": this.scenarioColorIndex[a],
                            "opacity": 1 / 3,
                            "showInLegend": true,
                            "gapSize": 0
                        }
                    ]
                }) : [];



            let yAxis = { title: { text: selectedVariable } };
            let chartData = [...histChartData, ...forecastChartData].flat();
            if (chartData.length && selectedPercentiles.length && selectedScenarios.length) {
                chartData = chartData.filter(a => selectedPercentiles.includes(a.percentile))
            } else chartData = [];
            this.plotChart(chartData, "chart-future-climate", yAxis);
        } 
        // else {
        //     this.pageAlert("Error in reading dataset, please check", 0);
        // }

    }

    plotChart = (chartData, container, yAxis) => {
        $(`div#${container}`).empty();
        $(`div#${container}-legend`).empty();
        if (chartData.length) {
            Highcharts.chart(container, {
                title: { text: null },
                credits: { enabled: false },
                exporting: { enabled: true },
                legend: { enabled: false },
                xAxis: {
                    type: 'datetime',
                    plotLines: [{
                        color: 'black',
                        width: 2,
                        value: Date.UTC(2015, 0, 1)
                    }],
                    gapSize: 0
                },
                yAxis: {
                    ...yAxis, plotLines: [{
                        value: 0,
                        color: 'black',
                        width: 2,
                        zIndex: 4
                    }],
                },
                tooltip: { shared: true, valueDecimals: 2 },
                plotOptions: {
                    "arearange": { marker: { enabled: false }, states: { hover: { enabled: false } }, events: { legendItemClick: function () { return false } }, gapSize: 0 },
                    "line": { marker: { enabled: false }, states: { hover: { enabled: false } }, events: { legendItemClick: function () { return false } }, gapSize: 0 },
                },

                series: chartData
            });

            let lineSeries = chartData.filter(a => a.type == "line");
            let arearangeSeries = chartData.filter(a => a.type == "arearange");

            if (lineSeries.length) {
                let lineSeriesLegend = `<div class="text-center">${lineSeries.map(a => `
                    <span class="mx-3" style="color:black; display: inline-block;">
                        <div style="background-color:${a.color}; width: 10px; height: 2px; display: inline-block; vertical-align: middle;"></div>
                        ${a.name}
                    </span>`).join("")}</div>`;
                $(`div#${container}-legend`).append(lineSeriesLegend);
            }

            if (arearangeSeries.length) {
                let arearangeSeriesLegend = `<div class="text-center">${arearangeSeries.map(a => `
                    <span class="mx-3" style="color:black; display: inline-block;">
                        <div style="background-color:${a.color}; width: 10px; height: 10px; border-radius: 50%; display: inline-block;"></div>
                        ${a.name}
                    </span>`).join("")}</div>`;
                $(`div#${container}-legend`).append(arearangeSeriesLegend);
            }

        } else $(`div#${container}`).empty().html(`<div class="mt-5 text-center">No data available</div>`)
    }


    loadHtmlFile = (fileName) => new Promise((resolve, reject) => {
        $.ajax({
            "type": "GET",
            "url": `./assets/data/senegal/${fileName}`,
            "success": response => resolve(response),
            "error": err => reject(err)
        });
    })


    loadExcelFile = (fileName) => new Promise((resolve, reject) => {
        this.startWaiting()
        fetch(`./assets/data/senegal/${fileName}`).then(res => res.blob()).then(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const bstr = e.target.result;
                resolve(bstr)
            }
            reader.readAsBinaryString(file);
        }).catch(err => reject(err))
    });


    excelToArray = (file, ...sheets) => {
        let wb = XLSX.read(file, { type: 'binary' });
        return sheets.map(sheet => {
            let rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, raw: false });
            let header = rows[0];
            let body = rows.slice(1,);
            let data = body.map(a => {
                let result = {};
                header.forEach((b, i) => result[b] = ["NULL", undefined, null].includes(a[i]) ? null : (isNaN(a[i]) ? a[i].replace(/\"/g, "") : this.num(a[i])));
                return result;
            });
            return data;
        })
    }

    uqArray = (arr) => [...new Set(arr)];
    sumArray = (arr) => arr.reduce((a, b) => a + b, 0);
    num = (val) => !isNaN(val) ? parseFloat(val) : 0;

    zfill = (number, width) => {
        const numString = String(number);
        const padding = width - numString.length > 0 ? width - numString.length : 0;
        return '0'.repeat(padding) + numString;
    };

    startWaiting = () => {
        let loadingIcon = `<div class="text-center"><div class="fa-3x mb-1"><i class="fa fa-spinner fa-pulse" aria-hidden="true"></i></div><span>Loading</span></div>`;
        $("#loading-modal-container").empty().html(loadingIcon);
        $('#loading-modal').modal('show');
    }

    stopWaiting = () => {
        $("#loading-modal-container").empty();
        $("#loading-modal").modal("hide");
    }

    pageAlert = (text, success) => {
        let alertIcon = success !== null || success !== undefined
            ? (success 
                ? `<img src="assets/images/success.png"><h5 class="success-text-popup my-2">SUCCESS!</h5>`
                : `<img src="assets/images/success-false.png"><h5 class="success-text-popup my-2">ERROR!</h5>`)
            : "";
        $("div#icon-alert-modal").empty().html(alertIcon);
        $("h5#text-alert-modal").empty().html(text);
        $("div.modal#alertModal").modal("show");
    }
}


class KenyaClimateOutlook{
    constructor(){
        this.locations = [
            "Kenya", 
            "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", 
            "Embu", "Garissa", "Homa Bay", "Isiolo", "Kajiado", "Kakamega", 
            "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", 
            "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", 
            "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", 
            "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", 
            "Nyeri", "Samburu", "Siaya", "Taita Taveta", "Tana River", 
            "Tharaka-Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", 
            "Vihiga", "Wajir", "West Pokot"
        ];

        // filters
        this.filterFCProvince = $("select#filter-future-climate-province");
        this.filterFCVariable = $("select#filter-future-climate-variable");
        this.filterFCPercentile = $("select#filter-future-climate-percentile");
        this.percentiles = ["50th", "10th-90th",];
        this.selectedPercentiles = [];
        this.filterFCScenario = $("select#filter-future-climate-scenario");
        this.scenarioColorIndex = {
            "Historical": "black",
            // "SSP-1.9": "blue",
            "SSP1-2.6": "green",
            "SSP2-4.5": "yellow",
            "SSP3-7.0": "orange",
            "SSP5-8.5": "red"
        }
        this.scenarios = Object.keys(this.scenarioColorIndex);
        this.selectedScenarios = [];

        this.tempVariables = [];
        this.actualPrecVariable = "Precipitation";
        this.precVariables = [];

        this.temperatureData = [];
        this.actualPrecipitationData = [];
        this.precipitationData = [];
        this.baselineYear = 2015;

        this.percentileValues = {
            "50th": "Medium",
            "10th-90th": "Low-High"
        };
        this.refFutureClimate = $("a#reference-fc");
        this.refFutureClimateLink = "https://climateknowledgeportal.worldbank.org/country/kenya/climate-data-projections";

        // 1st, 2nd and 4th tabs
        this.tabClimateRiskProfile = $("div#content-climate-risk-profile");
        this.tabClimateRiskVisualizer = $("div#content-climate-risk-visualizer");
        this.tabClimateSectorialImpact = $("div#content-sectorial-climate-impact");
        this.templateClimateRiskProfile = "kenya_climate_risk_profile.html";
        this.templateClimateRiskVisualizer = "kenya_climate_risk_visualizer.html";
        this.templateClimateSectorialImpact = "kenya_sectorial_climate_impact.html";

        
        this.meanTempData = [];
        this.maxTempData = [];
        this.minTempData = [];
        this.pcpData = [];
        this.pcp1DayData = [];
        this.pcp5DayData = [];
        this.pcp20mmData = [];
        this.pcp50mmData = [];

        this.paramIndex = {
            "Mean": this.meanTempData,
            "Min": this.minTempData,
            "Max": this.maxTempData,
            "Precipitation": this.pcpData,
            "Average 1 day precipitation": this.pcp1DayData,
            "Average 5 day precipitation": this.pcp5DayData,
            "Days with 20mm precipitation": this.pcp20mmData,
            "Days with 50mm precipitation": this.pcp50mmData,
        };
        this.selectpickerCommonOptions = {
            actionsBox: true,
            liveSearch: true,
            selectedTextFormat: "count > 1",
            size: 5,
        };
    }

    init = () => {
        this.filterFCProvince?.selectpicker("destroy");
        this.filterFCVariable?.selectpicker("destroy");
        this.filterFCPercentile?.selectpicker("destroy");
        this.filterFCScenario?.selectpicker("destroy");
        this.refFutureClimate.empty().attr("href", this.refFutureClimateLink).html(this.refFutureClimateLink);
        this.loadData();
    }

    loadData = () => {
        Promise.all([
            this.loadHtmlFile(this.templateClimateRiskProfile),
            this.loadHtmlFile(this.templateClimateRiskVisualizer),
            this.loadHtmlFile(this.templateClimateSectorialImpact),
            this.loadExcelFile("futureclimate_timeseries.xlsx")
        ])
        .then(([riskProfileData, riskVisualizerData, sectorialImpactData, timeseriesData]) => {
            // 1, 2, 4 tabs
            this.tabClimateRiskProfile.empty().html(riskProfileData);
            this.tabClimateRiskVisualizer.empty().html(riskVisualizerData);
            this.tabClimateSectorialImpact.empty().html(sectorialImpactData);
            // 3 tab
            [
                this.paramIndex["Mean"],
                this.paramIndex["Min"],
                this.paramIndex["Max"],
                this.paramIndex["Precipitation"],
                this.paramIndex["Average 1 day precipitation"],
                this.paramIndex["Average 5 day precipitation"],
                this.paramIndex["Days with 20mm precipitation"],
                this.paramIndex["Days with 50mm precipitation"],
            ] = this.excelToArray(
                    timeseriesData, 
                    "Mean_Temperature", "Minimum_Temperature", "Maximum_Temperature", "Precipitation",
                    "Average 1 day PCP", "Average 5 day PCP", "Days with PCP_20mm", "Days with PCP_50mm"
            );
            // filter - province - single
            let filterProvinceHtml = this.locations.map(a => {
                return `<option value="${a}">${a}</option>`;
            }).join("\n");
            this.filterFCProvince.empty().html(filterProvinceHtml);
            this.filterFCProvince.selectpicker(this.selectpickerCommonOptions);
            // filter - parameter - single
            let filterVariableHtml = `
                <optgroup label="Temperature">
                    <option value="Mean">Mean</option>
                    <option value="Min">Min</option>
                    <option value="Max">Max</option>
                </optgroup>
                <optgroup label="Precipitation">
                    <option value="Precipitation">Precipitation</option>
                    <option value="Average 1 day precipitation">Average 1 day precipitation</option>
                    <option value="Average 5 day precipitation">Average 5 day precipitation</option>
                    <option value="Days with 20mm precipitation">Days with 20mm precipitation</option>
                    <option value="Days with 50mm precipitation">Days with 50mm precipitation</option>
                </optgroup>
            `;
            this.filterFCVariable.empty().html(filterVariableHtml);
            this.filterFCVariable.selectpicker(this.selectpickerCommonOptions);
            // filter - percentile - multiple
             // filter - percentile
             let percentileOptionsHtml = this.percentiles.map(a => `<option value="${a}">${a}</option>`).join("\n");
             this.filterFCPercentile.empty().html(percentileOptionsHtml);
             this.filterFCPercentile.selectpicker(this.selectpickerCommonOptions);
             this.filterFCPercentile.selectpicker("selectAll").selectpicker("refresh");
             // filter - scenario
             let scenarioOptionsHtml = this.scenarios.map(a => `<option value="${a}">${a}</option>`).join("\n");
             this.filterFCScenario.empty().html(scenarioOptionsHtml);
             this.filterFCScenario.selectpicker(this.selectpickerCommonOptions);
             this.filterFCScenario.selectpicker("selectAll").selectpicker("refresh");
             $("div#chart-future-climate").empty();
        })
        .then(() => {
            this.plotRiskVisualizerChart('climate_risk_visualizer', 'Climate Risk Visualizer', [6.7], 'Medium');
            this.plotRiskVisualizerChart('hazard_and_exposure', 'Hazard & Exposure', [8.5], 'Low');
            this.plotRiskVisualizerChart('vulnerability_guage', 'Vulnerability', [6.1], 'Medium');
            this.plotRiskVisualizerChart('lack_of_coping_capacity', 'Lack of Coping Capacity', [5.8], 'Medium');

            // events - province change
            this.filterFCProvince.on("change", this.refreshClimateData);
            // events - variable change
            this.filterFCVariable.on("change", this.refreshClimateData);
            // events - percentile change
            this.filterFCPercentile.on("change", () => {
                this.selectedPercentiles = this.filterFCPercentile.selectpicker("val");
                this.refreshClimateData();
            });
            // events - scenario change
            this.filterFCScenario.on("change", () => {
                this.selectedScenarios = this.filterFCScenario.selectpicker("val");
                this.refreshClimateData();
            });
        })
        .then(() => {
            this.selectedPercentiles = Object.assign([], this.percentiles);
            this.selectedScenarios = Object.assign([], this.scenarios);
        })
        .then(() => this.filterFCProvince.trigger("change"))
        .catch(err => {
            this.pageAlert("Unable to load data, check console for details", 0);
            console.error(err);
        })
        .finally(() => this.stopWaiting())
    }

    plotRiskVisualizerChart = (chartId, title, data, valueSuffix) => {
        Highcharts.chart(chartId, {
            chart: { type: 'gauge', backgroundColor: 'transparent' },
            title: { text: null },
            pane: { startAngle: -90, endAngle: 89.9, background: null, center: ['50%', '85%'], size: '120%' },
            exporting: { enabled: false },
            credits: { enabled: false },
            yAxis: {
                min: 0, max: 10, tickPixelInterval: 72, tickPosition: 'inside', tickColor: Highcharts.defaultOptions.chart.backgroundColor || '#FFFFFF',
                tickLength: 0, tickWidth: 2, minorTickInterval: null, labels: { distance: 20 }, lineWidth: 0,
                plotBands: [
                    { from: 0, to: 2, color: '#28a83d', thickness: 50 },
                    { from: 2, to: 4, color: '#80c32b', thickness: 50 },
                    { from: 4, to: 6, color: '#ffdb0f', thickness: 50 },
                    { from: 6, to: 8, color: '#ef7e08', thickness: 50 },
                    { from: 8, to: 10, color: '#e22d03', thickness: 50 }
                ]
            },
            series: [{
                name: title,
                data: data,
                tooltip: { valueSuffix: valueSuffix },
                dataLabels: { format: '{y}', y: 100, borderWidth: 0, style: { fontSize: '19px' } },
                dial: { radius: '80%', backgroundColor: '#000000', baseWidth: 12, baseLength: '0%', rearLength: '0%' },
                pivot: { backgroundColor: '#000000', radius: 6 }
            }]
        });
    };

    refreshClimateData = () => {
        let selectedProvince = this.filterFCProvince.val();
        let selectedVariable = this.filterFCVariable.val();
        let selectedPercentiles = this.selectedPercentiles;
        let selectedScenarios = this.selectedScenarios;

        let dataset = this.paramIndex[selectedVariable]

        if (dataset) {
            let provinceDataset = dataset.filter(a =>
                // a[variableHeader] == selectedVariable &&
                selectedScenarios.includes(a["SCENARIO"])
            ).map(a => {
                return {
                    "year": a["Year"],
                    "percentile": a["Percentile"].replace(/ /g, ""),
                    "scenario": a["SCENARIO"],
                    "value": a[selectedProvince]
                }
            })
            let baselineDataset = provinceDataset.filter(a => a.year <= this.baselineYear);
            let p10Arr = baselineDataset.filter(b => b.percentile == "10th").map(b => b.value);
            let p50Arr = baselineDataset.filter(b => b.percentile == "50th").map(b => b.value);
            let p90Arr = baselineDataset.filter(b => b.percentile == "90th").map(b => b.value);
            let baselineAverages = {
                "p10Avg": this.sumArray(p10Arr) / (p10Arr.length),
                "p50Avg": this.sumArray(p50Arr) / (p50Arr.length),
                "p90Avg": this.sumArray(p90Arr) / (p90Arr.length),
            };

            // BASELINE (TILL 2014)
            let histYears = this.uqArray(provinceDataset.filter(a => a.year <= this.baselineYear).map(a => a.year));
            histYears.sort((x, y) => x > y ? 0 : -1);
            let histData = histYears.length
                ? histYears.map((a, i) => {
                    let yearsData = baselineDataset.filter(b => b.year == a);
                    let p10Curr = yearsData.find(c => c.percentile == "10th")?.value || 0;
                    let p50Curr = yearsData.find(c => c.percentile == "50th")?.value || 0;
                    let p90Curr = yearsData.find(c => c.percentile == "90th")?.value || 0;
                    // return { "year": a, "arearange": [i, p10Curr - baselineAverages.p10Avg, p90Curr - baselineAverages.p90Avg], "line": p50Curr - baselineAverages.p50Avg };
                    return { "year": a, "arearange": [i, p10Curr, p90Curr], "line": p50Curr };
                }).flat() : [];

            let histChartData = histData.length
                ? [
                    {
                        "type": "line",
                        "name": `Historic (Medium)`,
                        "percentile": "50th",
                        "data": histData.map(a => [Date.UTC(a.year, 0, 1), a.line]),
                        "color": "black",
                        "showInLegend": true,
                        "gapSize": 0
                    },
                    {
                        "type": "arearange",
                        "name": `Historic (Low-High)`,
                        "percentile": "10th-90th",
                        "data": histData.map(a => [Date.UTC(a.year, 0, 1), a.arearange[1], a.arearange[2]]),
                        "color": "black",
                        "opacity": 1 / 3,
                        "showInLegend": true,
                        "gapSize": 0
                    }
                ] : [];

            // TREND (FROM 2015)
            let forecastDataset = provinceDataset.filter(a => a.year >= this.baselineYear);
            let years = this.uqArray(forecastDataset.map(a => a.year));
            years.sort((x, y) => x > y ? 0 : -1);



            let forecastData = years.length
                ? years.map((a, i) => {
                    let yearsData = forecastDataset.filter(b => selectedScenarios.includes(b.scenario) && b.year == a);
                    let scenarioWiseData = selectedScenarios.map(b => {
                        let yearScenarioData = yearsData.filter(c => c.scenario == b);
                        if (yearScenarioData.length) {
                            let p10Curr = yearScenarioData.find(c => c.percentile == "10th")?.value || 0;
                            let p50Curr = yearScenarioData.find(c => c.percentile == "50th")?.value || 0;
                            let p90Curr = yearScenarioData.find(c => c.percentile == "90th")?.value || 0;
                            // return { "year": a, "scenario": b, "arearange": [i, p10Curr - baselineAverages.p10Avg, p90Curr - baselineAverages.p90Avg], "line": p50Curr - baselineAverages.p50Avg };
                            return { "year": a, "scenario": b, "arearange": [i, p10Curr, p90Curr], "line": p50Curr  };
                        } else return null;
                    }).filter(Boolean)
                    return scenarioWiseData
                }).flat() : [];

            let forecastChartData = (selectedScenarios.length && forecastData.length)
                ? selectedScenarios.map((a, i) => {
                    return [
                        {
                            "type": "line",
                            "name": `${a} (Medium)`,
                            "percentile": "50th",
                            "data": forecastData.filter(b => b.scenario == a).map(b => [Date.UTC(b.year, 0, 1), b.line]),
                            "color": this.scenarioColorIndex[a],
                            "showInLegend": true,
                            "gapSize": 0
                        },
                        {
                            "type": "arearange",
                            "name": `${a} (Low-High)`,
                            "percentile": "10th-90th",
                            "data": forecastData.filter(b => b.scenario == a).map(b => [Date.UTC(b.year, 0, 1), b.arearange[1], b.arearange[2]]),
                            "color": this.scenarioColorIndex[a],
                            "opacity": 1 / 3,
                            "showInLegend": true,
                            "gapSize": 0
                        }
                    ]
                }) : [];



            let yAxis = { title: { text: selectedVariable } };
            let chartData = [...histChartData, ...forecastChartData].flat();
            if (chartData.length && selectedPercentiles.length && selectedScenarios.length) {
                chartData = chartData.filter(a => selectedPercentiles.includes(a.percentile))
            } else chartData = [];
            this.plotChart(chartData, "chart-future-climate", yAxis);
        } 
        // else {
        //     this.pageAlert("Error in reading dataset, please check", 0)
        // }

    }

    plotChart = (chartData, container, yAxis) => {
        $(`div#${container}`).empty();
        $(`div#${container}-legend`).empty();
        if (chartData.length) {
            Highcharts.chart(container, {
                title: { text: null },
                credits: { enabled: false },
                exporting: { enabled: true },
                legend: { enabled: false },
                xAxis: {
                    type: 'datetime',
                    plotLines: [{
                        color: 'black',
                        width: 2,
                        value: Date.UTC(2015, 0, 1)
                    }],
                    gapSize: 0
                },
                yAxis: {
                    ...yAxis, plotLines: [{
                        value: 0,
                        color: 'black',
                        width: 2,
                        zIndex: 4
                    }],
                },
                tooltip: { shared: true, valueDecimals: 2 },
                plotOptions: {
                    "arearange": { marker: { enabled: false }, states: { hover: { enabled: false } }, events: { legendItemClick: function () { return false } }, gapSize: 0 },
                    "line": { marker: { enabled: false }, states: { hover: { enabled: false } }, events: { legendItemClick: function () { return false } }, gapSize: 0 },
                },

                series: chartData
            });

            let lineSeries = chartData.filter(a => a.type == "line");
            let arearangeSeries = chartData.filter(a => a.type == "arearange");

            if (lineSeries.length) {
                let lineSeriesLegend = `<div class="text-center">${lineSeries.map(a => `
                    <span class="mx-3" style="color:black; display: inline-block;">
                        <div style="background-color:${a.color}; width: 10px; height: 2px; display: inline-block; vertical-align: middle;"></div>
                        ${a.name}
                    </span>`).join("")}</div>`;
                $(`div#${container}-legend`).append(lineSeriesLegend);
            }

            if (arearangeSeries.length) {
                let arearangeSeriesLegend = `<div class="text-center">${arearangeSeries.map(a => `
                    <span class="mx-3" style="color:black; display: inline-block;">
                        <div style="background-color:${a.color}; width: 10px; height: 10px; border-radius: 50%; display: inline-block;"></div>
                        ${a.name}
                    </span>`).join("")}</div>`;
                $(`div#${container}-legend`).append(arearangeSeriesLegend);
            }

        } else $(`div#${container}`).empty().html(`<div class="mt-5 text-center">No data available</div>`)
    }


    loadHtmlFile = (fileName) => new Promise((resolve, reject) => {
        $.ajax({
            "type": "GET",
            "url": `./assets/data/kenya/${fileName}`,
            "success": response => resolve(response),
            "error": err => reject(err)
        });
    })


    loadExcelFile = (fileName) => new Promise((resolve, reject) => {
        this.startWaiting()
        fetch(`./assets/data/kenya/${fileName}`).then(res => res.blob()).then(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const bstr = e.target.result;
                resolve(bstr)
            }
            reader.readAsBinaryString(file);
        }).catch(err => reject(err))
    });


    excelToArray = (file, ...sheets) => {
        let wb = XLSX.read(file, { type: 'binary' });
        return sheets.map(sheet => {
            let rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, raw: false });
            let header = rows[0];
            let body = rows.slice(1,);
            let data = body.map(a => {
                let result = {};
                header.forEach((b, i) => result[b] = ["NULL", undefined, null].includes(a[i]) ? null : (isNaN(a[i]) ? a[i].replace(/\"/g, "") : this.num(a[i])));
                return result;
            });
            return data;
        })
    }

    uqArray = (arr) => [...new Set(arr)];
    sumArray = (arr) => arr.reduce((a, b) => a + b, 0);
    num = (val) => !isNaN(val) ? parseFloat(val) : 0;

    zfill = (number, width) => {
        const numString = String(number);
        const padding = width - numString.length > 0 ? width - numString.length : 0;
        return '0'.repeat(padding) + numString;
    };

    startWaiting = () => {
        let loadingIcon = `<div class="text-center"><div class="fa-3x mb-1"><i class="fa fa-spinner fa-pulse" aria-hidden="true"></i></div><span>Loading</span></div>`;
        $("#loading-modal-container").empty().html(loadingIcon);
        $('#loading-modal').modal('show');
    }

    stopWaiting = () => {
        $("#loading-modal-container").empty();
        $("#loading-modal").modal("hide");
    }

    pageAlert = (text, success) => {
        let alertIcon = success !== null || success !== undefined
            ? (success 
                ? `<img src="assets/images/success.png"><h5 class="success-text-popup my-2">SUCCESS!</h5>`
                : `<img src="assets/images/success-false.png"><h5 class="success-text-popup my-2">ERROR!</h5>`)
            : "";
        $("div#icon-alert-modal").empty().html(alertIcon);
        $("h5#text-alert-modal").empty().html(text);
        $("div.modal#alertModal").modal("show");
    }
}