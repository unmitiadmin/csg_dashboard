$(window).on("load", () => {
    let countryId = parseInt(getCookies(document.cookie).countryId) || parseInt(getCookies(document.cookie).initialCountryId);
    let crossCuttingCatalog = new CrossCutting(countryId);
    crossCuttingCatalog.init()
});


class CrossCutting {
    constructor(countryId) {
        this.categoryId = 3; // only change this for other categories
        this.apiUrl = apiUrl;
        this.countryId = countryId;
        this.filterCountry = $("select#filter-country");
        this.selectedCountryId = this.filterCountry.val();

        this.cookieObject = getCookies(document.cookie);
        this.jwt = this.cookieObject.jwt;
        this.userEmail = this.cookieObject.userEmail;
        this.isLoggedIn = this.cookieObject.isLoggedIn;
        this.userRoleId = this.cookieObject.userRoleId;
        this.initialCountryId = this.cookieObject.initialCountryId;
        this.authHeader = { "Authorization": this.jwt };
        this.logoutLink = $("a#link-logout");
        this.userMgmtLink = $("li#user-management-link");
        this.loggedInUserEmailLabel = $("li#user-email-label");
        this.userCountryIcon = $("img#user-country-icon");
        this.linksManagement = $("div#links-manage-projects");

        this.commonChartOptions = {
            credits: { enabled: false },
            exporting: { genabled: true },
            title: { text: null },
            subtitle: { text: null },
            legend: { enabled: false },
        };
        this.commonTooltip = {
            tooltip: {
                formatter: function () {
                    let value = this.y;
                    let formattedValue =
                        value >= 1e9 ? (value / 1e9).toFixed(2) + ' B' :
                            value >= 1e6 ? (value / 1e6).toFixed(2) + ' M' :
                                value >= 1e3 ? (value / 1e3).toFixed(2) + ' K' :
                                    value;
                    return `${this.key}: <b>${formattedValue}</b>`;
                }
            },
        };
        this.sankeyTooltip = {
            tooltip: {
                formatter: function () {
                    if (this.point.options.isNode) {
                        return this.point.options.id
                    } else {
                        let value = this.point.options.weight;
                        let formattedValue =
                            value >= 1e9 ? (value / 1e9).toFixed(2) + ' B' :
                                value >= 1e6 ? (value / 1e6).toFixed(2) + ' M' :
                                    value >= 1e3 ? (value / 1e3).toFixed(2) + ' K' :
                                        value;
                        return `${this.point.options.from} → ${this.point.options.to}: <b>${formattedValue}</b>`;
                    }
                }
            },
        };
        this.projectStatusIcons = {
            "New": "status-new.svg",
            "Ongoing": "status-inprogress.svg",
            "Completed": "status-completed.svg",
        };

        this.projectList = [];
        this.searchProjectText = $("input[type='text']#search-project-text");
        this.labelCountry = $("span.label-country");
    }

    init = () => {
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        this.userRoleId == 1 ? this.filterCountry.show() : this.filterCountry.hide();
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.logoutLink.on("click", this.onLogoutClick);
        this.filterCountry.on("change", () => {
            this.selectedCountryId = this.filterCountry.val();
            (this.userRoleId != 1 && (this.initialCountryId == this.selectedCountryId)) || this.userRoleId == 1
                ? this.linksManagement.show() : this.linksManagement.hide();
            this.countryId = this.selectedCountryId;
            document.cookie = `countryId=${this.selectedCountryId}`;
            this.labelCountry.empty().html($("select#filter-country option:selected").text());
            this.execute();
        });
        this.userRoleId != 1
            ? this.filterCountry.val(this.initialCountryId).trigger("change")
            : this.filterCountry.val(this.countryId).trigger("change");
    }

    execute = () => {
        if (this.isLoggedIn) {
            this.userRoleId != 1
                ? this.userCountryIcon.attr("src", `./assets/flag_icons/${this.initialCountryId}.png`).show()
                : this.userCountryIcon.attr("src", null).hide();
            this.fetchData();
        }
        else {
            this.userCountryIcon.attr("src", null).hide();
            this.pageAlert("Please log in", 0);
            setTimeout(() => window.location.replace("index.html"), 3000);
        }
    }

    onLogoutClick = () => {
        document.cookie = `userEmail=null`;
        document.cookie = `jwt=null`;
        document.cookie = `isLoggedIn=false`;
        document.cookie = `userRoleId=null`;
        document.cookie = `initialCountryId=null`;
        this.pageAlert("Logged out successfully", 1);
        window.location.replace("index.html");
    }

    fetchData = () => {
        let reqBody = { "country_id": Number(this.countryId), "category_id": Number(this.categoryId) }
        this.postApi(reqBody, this.authHeader, "projects/catalog")
            .then(response => {
                let summaryData = response.data.summary;
                this.fillCounts(summaryData)
                this.projectList = response.data.list;
                this.fillTable(this.projectList);
                this.fillCards(this.projectList);
                let categoryData = response.data.category_data;
                this.drawChart1(categoryData.budget_by_sector, "chart_budget_by_sector");
                this.drawChart2(categoryData.budget_by_hazard, "chart_budget_by_hazard");
                this.drawChart3(categoryData.projects_by_beneficiary_type, "chart_projects_by_beneficiary_type");
                this.drawChart4(categoryData.projects_by_beneficiary_category, "chart_projects_by_beneficiary_category");
                this.drawChart5(categoryData.projects_by_province, "chart_projects_by_province");
                this.drawChart6(categoryData.sectors_by_province, "chart_sectors_by_province");
                this.drawChart7(categoryData.sector_budget_by_province, "chart_sector_budget_by_province");
                let comparitiveData = response.data.comparitive_data;
                this.drawChart8(comparitiveData.projects_by_category, "chart_projects_by_category");
                this.drawChart9(comparitiveData.project_budget_by_category, "chart_project_budget_by_category");
            })
            .then(() => this.bindSearch())
            .catch(err => {
                this.pageAlert(err?.responseJSON?.message || "Error in displaying data", 0)
                console.error(err);
            })
            .finally(() => this.stopWaiting());
    }

    fillCounts = (summaryData) => {
        $("h5#count-projects").empty().html(summaryData.projects);
        $("h5#count-beneficiaries").empty().html(strNum(summaryData.beneficiaries));
        $("h5#sum-budget").empty().html(strNum(summaryData.budget));
    }

    bindSearch = () => {
        this.searchProjectText.unbind("input")
            .on("input", e => {
                let searchText = e.currentTarget.value;
                let filteredList = this.projectList.filter(a => String(a.project_name).replace(/�/g, "").toLocaleLowerCase().includes(String(searchText.replace(/�/g, "")).toLocaleLowerCase()));
                this.fillCards(filteredList);
                this.fillTable(filteredList);
            })
    }

    fillTable = (listData) => {
        let tBody = listData.map((a, i) => {
            return `<tr>
                <td>${i + 1}</td>
                <td>${a.project_name.replace(/�/g, "")}</td>
                <td>${a.start_year ?? "N/A"}</td>
                <td>${a.end_year ?? "N/A"}</td>
                <td>${a.current_status ?? "N/A"}</td>
                <td>
                    <a role="link" href="project_details.html?projectId=${a.id}" style="padding-left: 0px;"><u>View Details</u></a>
                </td>
            </tr>`;
        }).join("\n");

        $("tbody#tbody-project").empty().html(tBody)
        $("table#table-project").dataTable();
    }

    fillCards = (listData) => {
        if (listData.length) {
            let cardHtml = listData.map((a, i) => {
                let sdgTargeted = a.targeted_sdg_ids
                    ? a.targeted_sdg_ids.map(b => {
                        return `<div class="sdgGoals-box-3">
                            <div class="sdgGoalImgBox">
                                <img src="./assets/images/E_${this.zfill(b, 2)}.png" alt="1" class="sdgGoal-img mt-1" style="height: 60px; width: 60px;">
                            </div>
                            <!-- div class="sdgGoalIconBox">
                                <i class="fa fa-arrow-down text-danger"></i>
                            </div -->
                        </div>`
                    }).join("\n")
                    : "N/A";
                let imgSrc = this.projectStatusIcons[a.current_status]
                    ? `./assets/images/${this.projectStatusIcons[a.current_status]}`
                    : `./assets/images/status-unavailable.svg`;
                return `
                <div class="col-sm-12 col-md-6 col-lg-3">
                    <div class="card tab_card_bg">
                        <div class="card-body">
                            <div class="filter-cards">
                                <button class="btn btn-crosscutting text-white">Cross-cutting</button>
                                <p style="min-height:90px;">${a.project_name.replace(/�/g, "")}</p>
                                <div class="d-flex align-items-center justify-content-between flex-wrap">
                                    <div>
                                        <h5 class="mt-4">Current Status</h5>
                                        <button class="btn btn-active mt-2"><img src="${imgSrc}"> ${a.current_status || "Unavailable"}</button>
                                        <h5 class="mt-4">Targeted SDGs</h5>
                                        <div class="d-flex justify-content-start align-items-center mt-3 mb-2 flex-wrap">
                                            ${sdgTargeted}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <a href="project_details.html?projectId=${a.id}" class="btn btn-viewmore w-100 mt-3">View More</a>
                        </div>
                    </div>
                </div>
                `;
            }).join("\n");
            $("div.row#cards-catalog").empty().html(cardHtml);
        } else $("div.row#cards-catalog").empty().html(`<div class="text-center mt-3">No results from search</div>`);
    }

    drawChart1 = (chartData, container) => {
        // budget_by_sector
        if (chartData.length) {
            Highcharts.chart(container, {
                chart: { type: "pie" },
                ...this.commonChartOptions,
                ...this.commonTooltip,
                plotOptions: {
                    pie: {
                        allowPointSelect: true,
                        cursor: 'pointer',
                        dataLabels: {
                            enabled: true,
                            format: '<b>{point.name}</b>: {point.percentage:.1f}%',
                            style: { fontSize: '14px' },
                        },
                    },
                },
                series: [{
                    name: "Budget ($)",
                    data: chartData.map(item => ({
                        name: item.name,
                        y: item.value,
                    }))
                }]
            })
        } else $(`div#${container}`).empty().html(`<div class="text-center mt-5">Data unavailable</div>`);
    }


    drawChart2 = (chartData, container) => {
        // budget_by_hazard
        if (chartData.length) {
            Highcharts.chart(container, {
                chart: { type: "column" },
                ...this.commonChartOptions,
                ...this.commonTooltip,
                xAxis: { categories: chartData.map(item => item.name), },
                yAxis: { title: { text: 'Budget ($)', }, allowDecimals: false },
                series: [{
                    name: 'Budget ($)',
                    data: chartData.map(item => item.value),
                }],
            });
        } else $(`div#${container}`).empty().html(`<div class="text-center mt-5">Data unavailable</div>`);
    }

    drawChart3 = (chartData, container) => {
        // projects_by_beneficiary_type
        if (chartData.length) {
            Highcharts.chart(container, {
                chart: { type: "column" },
                ...this.commonChartOptions,
                ...this.commonTooltip,
                xAxis: { categories: chartData.map(item => item.name), },
                yAxis: { title: { text: 'Projects', }, allowDecimals: false },
                plotOptions: { colorByPoint: true },
                series: [{
                    name: 'Beneficiaries',
                    colorByPoint: true,
                    data: chartData.map(item => item.value),
                }],
            });
        } else $(`div#${container}`).empty().html(`<div class="text-center mt-5">Data unavailable</div>`);
    }

    drawChart4 = (chartData, container) => {
        // projects_by_beneficiary_category
        if (chartData.length) {
            Highcharts.chart(container, {
                chart: { type: "bar" },
                ...this.commonChartOptions,
                ...this.commonTooltip,
                xAxis: { categories: chartData.map(item => item.name), },
                yAxis: { title: { text: 'Projects', }, allowDecimals: false },
                plotOptions: { colorByPoint: true },
                series: [{
                    name: 'Beneficiaries',
                    colorByPoint: true,
                    data: chartData.map(item => item.value),
                }],
            });
        } else $(`div#${container}`).empty().html(`<div class="text-center mt-5">Data unavailable</div>`);
    }

    drawChart5 = (chartData, container) => {
        // projects_by_province
        if (chartData.length) {
            Highcharts.chart(container, {
                chart: { type: "bar" },
                ...this.commonChartOptions,
                ...this.commonTooltip,
                xAxis: { categories: chartData.map(item => item.name), },
                yAxis: { title: { text: 'Projects', }, allowDecimals: false },
                plotOptions: { colorByPoint: true },
                series: [{
                    name: 'Beneficiaries',
                    colorByPoint: true,
                    data: chartData.map(item => item.value),
                }],
            });
        } else $(`div#${container}`).empty().html(`<div class="text-center mt-5">Data unavailable</div>`);
    }

    drawChart6 = (chartData, container) => {
        // sectors_by_province
        if (chartData.length) {
            Highcharts.chart(container, {
                ...this.commonChartOptions,
                ...this.sankeyTooltip,
                series: [{
                    type: 'sankey',
                    name: 'Sectors',
                    colorByPoint: true,
                    keys: ['from', 'to', 'weight'],
                    data: chartData,
                    dataLabels: { color: 'black', style: { textOutline: 'none' } }
                }],
            });
        } else $(`div#${container}`).empty().html(`<div class="text-center mt-5">Data unavailable</div>`);
    }

    drawChart7 = (chartData, container) => {
        // sector_budget_by_province
        if (chartData.length) {
            Highcharts.chart(container, {
                ...this.commonChartOptions,
                ...this.sankeyTooltip,
                series: [{
                    type: 'sankey',
                    name: 'Sectors',
                    colorByPoint: true,
                    keys: ['from', 'to', 'weight'],
                    data: chartData,
                    dataLabels: { color: 'black', style: { textOutline: 'none' } }
                }],
            });
        } else $(`div#${container}`).empty().html(`<div class="text-center mt-5">Data unavailable</div>`);
    }

    drawChart8 = (chartData, container) => {
        // projects_by_category
        if (chartData.length) {
            Highcharts.chart(container, {
                chart: { type: "pie" },
                ...this.commonChartOptions,
                ...this.commonTooltip,
                plotOptions: {
                    pie: {
                        allowPointSelect: true,
                        innerSize: '50%',
                        cursor: 'pointer',
                        dataLabels: {
                            enabled: true,
                            format: '<b>{point.name}</b>: {point.percentage:.1f}%',
                            style: { fontSize: '14px' },
                        },
                    },
                },
                series: [{
                    name: "Projects",
                    data: chartData.map(item => ({
                        name: item.name,
                        y: item.value,
                    }))
                }]
            })
        } else $(`div#${container}`).empty().html(`<div class="text-center mt-5">Data unavailable</div>`);
    }

    drawChart9 = (chartData, container) => {
        // project_budget_by_category
        if (chartData.length) {
            Highcharts.chart(container, {
                chart: { type: "pie" },
                ...this.commonChartOptions,
                ...this.commonTooltip,
                plotOptions: {
                    pie: {
                        allowPointSelect: true,
                        innerSize: '50%',
                        cursor: 'pointer',
                        dataLabels: {
                            enabled: true,
                            format: '<b>{point.name}</b>: {point.percentage:.1f}%',
                            style: { fontSize: '14px' },
                        },
                    },
                },
                series: [{
                    name: "Budget ($)",
                    data: chartData.map(item => ({
                        name: item.name,
                        y: item.value,
                    }))
                }]
            })
        } else $(`div#${container}`).empty().html(`<div class="text-center mt-5">Data unavailable</div>`);
    }

    postApi = (reqBody, reqHead, path) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "POST",
                "headers": reqHead,
                "data": reqBody,
                "beforeSend": () => this.startWaiting(),
                "url": `${this.apiUrl}/${path}`,
                "success": response => resolve(response),
                "error": err => reject(err)
            })
        })
    }

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

    
}