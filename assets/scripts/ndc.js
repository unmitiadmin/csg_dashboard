$(window).on("load", () => {
    let countryId = parseInt(getCookies(document.cookie).countryId) || parseInt(getCookies(document.cookie).initialCountryId);
    let addOutcome = new NDC(countryId);
    addOutcome.init();
});

class NDC {
    constructor(countryId) {
        this.apiUrl = apiUrl;
        this.countryId = countryId
        this.sdg_goals = []
        this.sdg_indicators = []
        this.graph_data = []
        this.cookieObject = getCookies(document.cookie);
        this.jwt = this.cookieObject.jwt;
        this.userEmail = this.cookieObject.userEmail;
        this.isLoggedIn = this.cookieObject.isLoggedIn;
        this.userRoleId = this.cookieObject.userRoleId;
        this.initialCountryId = this.cookieObject.initialCountryId;
        this.authHeader = { "Authorization": this.jwt };
        this.logoutLink = $("a#link-logout");

        if (!this.isLoggedIn || this.userRoleId >= 2) {
            $('#create_ndcs_btn').hide();
        }
    }

    init = () => {
        this.fetchData();
        this.logoutLink.on("click", this.onLogoutClick);
    }

    onLogoutClick = () => {
        document.cookie = `userEmail=null`;
        document.cookie = `jwt=null`;
        document.cookie = `isLoggedIn=false`;
        document.cookie = `initialCountryId=null`;
        document.cookie = `userRoleId=null`;
        this.pageAlert("Logged out successfully", 1);
        setTimeout(() => window.location.replace("index.html"), 1000);
    }

    fetchData = () => {
        Promise.all([
            // this.getApi(`./assets/data/srilanka/ndc/ndc.json`),
            // this.getApi(`./assets/data/srilanka/ndc/sdg_goals.json`),
            this.serverApi(this.authHeader, `/ndc/sdg`),
            this.serverApi(this.authHeader, `/ndc/sdg_target`),
            // this.getApi(`./assets/data/srilanka/ndc/sdg_indicators.json`),
            this.getApi(`./assets/data/srilanka/ndc/ndc_graph.json`),
            this.serverApi(this.authHeader, `/ndc/manage?country_id=4`),
            // below for dynamic tabs
            this.serverApi(this.authHeader, `/ndc/activity?country_id=4`),
        ])
            .then(([sdg_goals_, sdg_indicators_, graph_data, sector, dynamic_data]) => { //ndc_data, 
                const sdg_goals = sdg_goals_['data'];
                const sdg_indicators = sdg_indicators_['data'];

                const transformData = (data) => {
                    return data.reduce((acc, item) => {
                        const category = item.category;
                        const sector = item.sector;

                        if (!acc[category]) {
                            acc[category] = {};
                        }

                        if (!acc[category][sector]) {
                            acc[category][sector] = [];
                        }

                        acc[category][sector].push({
                            "NDC No.": item.ndc_number,
                            "Activity": item.activity,
                            "ndc_id": item.id,
                            "Sector_id": item['sector_id'],
                            "SDG": item.sdg
                        });

                        return acc;
                    }, {});
                };

                const ndc_data = transformData(dynamic_data['data']);

                this.generateGraph(graph_data);
                this.graph_data = graph_data;
                this.sdg_goals = sdg_goals
                this.sdg_indicators = sdg_indicators
                for (let main_key in ndc_data) {
                    let ind_ndc_data = ndc_data[main_key];
                    for (let key in ind_ndc_data) {
                        sector.data.forEach(rangeBarObj => {
                            ind_ndc_data[key].forEach(entry => {
                                if (entry["NDC No."] == rangeBarObj.ndc_number.toString() && rangeBarObj.sector == key && rangeBarObj.category == main_key) {
                                    entry.range_value = rangeBarObj.value;
                                }
                            })
                        })
                    }
                    Object.keys(ind_ndc_data).forEach(category => {
                        let tab_id = main_key === 'Mitigation' ? `pills-${category}Sector` : `pills-${category}`;
                        let categoryId = main_key === 'Adaptation' ? 1 : (main_key === 'Mitigation' ? 2 : 1);
                        this.generateHtml(ind_ndc_data[category], tab_id, category, categoryId);
                    });
                }
            })
            .catch(err => {
                console.error(err);
                if (err.status == 401) {
                    this.pageAlert("Session expired, please login", 0);
                    setTimeout(() => window.location.replace("index.html"), 1000);
                } else this.pageAlert("Unable to get data", 0);
            })
            .finally(() => this.stopWaiting())
    }

    generateGraph(graph_data) {
        // console.log(graph_data)
        // console.log(graph_data.pageProps.country.data.total_ghg_emissions.data)

        let emission_yearly_data = graph_data.pageProps.country.data.total_ghg_emissions.data;
        let estimated_ndc = graph_data.pageProps.country.data.total_ghg_emissions.ndcs;
        // console.log(estimated_ndc)
        // console.log(emission_yearly_data.map(data => data.year))
        // let categories = [1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038, 2039, 2040, 2041, 2042, 2043, 2044, 2045, 2046, 2047, 2048, 2049, 2050, 2051, 2052, 2053, 2054, 2055, 2056, 2057, 2058, 2059, 2060, 2061, 2062, 2063, 2064, 2065, 2066, 2067, 2068, 2069, 2070];

        let categories = emission_yearly_data.map(data => data.year);
        Highcharts.chart('srilanka_ghg_graph', {
            chart: {
                type: 'line',
                height: 600, // Adjust the height as needed to stretch the chart vertically
            },
            title: {
                text: 'Total GHG Emissions by Year'
            },
            xAxis: {
                title: {
                    text: 'Year'
                },
                categories: categories,
                tickPositioner: function () {
                    let positions = [];
                    categories.forEach(function (category, index) {
                        if (category % 10 === 0) {
                            positions.push(index);
                        }
                    });
                    return positions;
                },
                gridLineWidth: 1,
                gridLineDashStyle: 'Dash',
            },
            yAxis: {
                title: {
                    text: 'Emissions'
                },
                tickInterval: 10,
                gridLineWidth: 1,
                gridLineDashStyle: 'Dash',
            },
            plotOptions: {
                areaspline: {
                    fillOpacity: 0.5
                }
            },
            tooltip: {
                valueSuffix: ' units'
            },
            series: [
                {
                    name: 'Total GHG Emissions',
                    type: 'line',
                    dashStyle: 'dot',
                    data: emission_yearly_data.map(data => ({
                        y: 'historical' in data ? Math.round(data.historical) : Math.round(data.range_midline),
                        name: data.year
                    }))
                },
                {
                    name: 'Range Midline',
                    type: 'spline',
                    data: emission_yearly_data.map(data => ({
                        y: 'range_midline' in data ? Math.round(data.range_midline) : null,
                        name: data.year
                    }))
                },
                {
                    name: 'aim_ssp1_19',
                    type: 'spline', // Set the series type to spline for range_midline data
                    data: emission_yearly_data.map(data => ({
                        y: 'aim_ssp1_19' in data ? Math.round(data.aim_ssp1_19) : null, // Round the value to the nearest integer based on the key present
                        name: data.year // Assign the year as the name for the data point
                    }))
                },
                {
                    name: 'image_ssp1_19',
                    type: 'spline', // Set the series type to spline for range_midline data
                    data: emission_yearly_data.map(data => ({
                        y: 'image_ssp1_19' in data ? Math.round(data.image_ssp1_19) : null, // Round the value to the nearest integer based on the key present
                        name: data.year // Assign the year as the name for the data point
                    }))
                },
                {
                    name: 'remind_cdr8',
                    type: 'spline', // Set the series type to spline for range_midline data
                    data: emission_yearly_data.map(data => ({
                        y: 'remind_cdr8' in data ? Math.round(data.remind_cdr8) : null, // Round the value to the nearest integer based on the key present
                        name: data.year // Assign the year as the name for the data point
                    }))
                },
                {
                    name: 'range_max',
                    type: 'spline', // Set the series type to spline for range_midline data
                    data: emission_yearly_data.map(data => ({
                        y: 'range_max' in data ? Math.round(data.range_max) : null, // Round the value to the nearest integer based on the key present
                        name: data.year // Assign the year as the name for the data point
                    }))
                },
                {
                    name: 'range_min',
                    type: 'spline', // Set the series type to spline for range_midline data
                    data: emission_yearly_data.map(data => ({
                        y: 'range_min' in data ? Math.round(data.range_min) : null, // Round the value to the nearest integer based on the key present
                        name: data.year // Assign the year as the name for the data point
                    }))
                },
                {
                    name: 'Total GHG Emissions Range',
                    type: 'arearange',
                    lineWidth: 0,
                    linkedTo: ':previous', // Link the series to the previous series (range_midline or any other line series)
                    color: 'rgba(124, 181, 236, 0.3)', // Set the color for the shaded area
                    fillOpacity: 1, // Set the opacity for the fill to 1 (fully opaque)
                    zIndex: 0, // Set the zIndex to make sure it's behind other series
                    data: emission_yearly_data.map(data => ({
                        x: emission_yearly_data.findIndex(item => item.year === data.year),
                        low: 'range_min' in data ? Math.round(data.range_min) : null,
                        high: 'range_max' in data ? Math.round(data.range_max) : null,
                        name: data.year
                    }))
                },

                // New series for estimated NDC with scatter type
                {
                    name: 'Estimated NDC',
                    type: 'scatter',
                    marker: {
                        symbol: 'circle',
                        radius: 5
                    },
                    data: estimated_ndc.map((data, index) => ({
                        x: emission_yearly_data.findIndex(item => item.year === data.year),
                        y: 'value' in data ? Math.round(data.value) : null,
                        name: data.year,
                        color: index == 0 ? 'rgb(255, 179, 79)' : 'rgb(42, 105, 217)' // Example: Assigning alternating colors based on the year
                    })),
                    tooltip: {
                        headerFormat: '<b>{point.key}</b><br>',
                        pointFormat: '{point.name}: {point.y}'
                    }
                }

            ]

        }, function (chart) {
            // Zoom the y-axis by default
            chart.yAxis[0].setExtremes(-10, 50);
        });
    }

    generateHtml(projects, id, category, categoryId) {
        projects = projects.sort((a, b) => {
            return a['NDC No.'] - b['NDC No.'];
        });
        let add_string = id.includes('Sector') ? 'Sector' : '';
        $(`#${id} .table-responsive`).html('');

        let htmlContent = `
        ${this.userRoleId == 1 ? `
            <div style="position: absolute; right: 16px;">
                <button class="reorder btn btn-reorder">
                    <span><img src="assets/images/reorder.png" height="24px"></span> Reorder
                </button>
                <button class="cancel btn btn-update-cancel d-none mx-2">Cancel</button>
                <button class="submit d-none btn btn-update-submit mx-2">Submit</button>
            </div>` : ''}
        <table class="table table-bordered tbl_sdg mt-4rem pt-3">
            <thead>
                <tr class="border">
                    <th style="width: 60px;">NDC Number</th>
                    <th style="padding-left: 15px !important;">Activity</th>
                    <th style="padding-left: 15px !important;">SDG</th>
                    ${this.userRoleId == 1 ? '<th style="padding-left: 10px !important;">Edit</th>' : ''}
                </tr>
            </thead>
            <tbody class="sortable">`;  // Added class "sortable" for jQuery UI sortable

        projects.forEach((project, index) => {
            htmlContent += `
                <tr data-ndc-number="${project['NDC No.']}">
                    <td style="width: 60px;padding:30px!important;">${project['NDC No.']}</td>
                    <td class="" style="width: 500px;padding:15px!important;">
                        <div>
                            <span>${project['Activity']}</span>
                            <div class="progress-box mt-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div><span class="text-edit text-dark">Progress:</span></div>
                                    <div>${this.userRoleId == 1 ? `<div id="${category}_${index}${add_string}_edit_btn" class="text-primary text-edit" data-category="${category}" data-countryId="${this.countryId}" data-index="${index + 1}" data-categoryId="${categoryId}">Edit</div>` : ''}</div>
                                </div>    
                                <div class="mt-3 slider_box ${this.get_range_bar_color(+project['range_value'])}" id="${category}_${index}_${add_string}">
                                    <input type="range" id="${category}_${index}${add_string}" name="${category}_${index}${add_string}" value="${project['range_value']}" class="progress-slider" min="0" max="100">
                                </div>
                                <div class="d-flex justify-content-between mt-1">
                                    <div class="low-range">Not achieved</div>
                                    <div class="high-range">Achieved</div>
                                </div>
                            </div>
                        </td>
                        <td class="" style="width: 400px;padding:15px!important">${project['SDG'] ? this.generateGoals(project['SDG']) : ''}</td>
                        ${this.userRoleId == 1 ? `
                            <td style="width: 100px;padding-left: 10px !important;">
                                <a href="create_ndcs.html?id=${project.ndc_id}" class="btn btn-cancel-ndc-edit" target="_blank">
                                    Edit <img src="./assets/images/edit.svg" height="15px" class="ps-1">
                                </a>
                            </td>
                        ` : ''}                        
                    </tr> `;
        });

        htmlContent += `
            </tbody>
        </table>`;

        $(`#${id} .table-responsive`).html(htmlContent);


        // Handle Reorder Button Click
        $(`#${id} .reorder`).on('click', function () {
            $(this).addClass('d-none');
            $(`#${id} .cancel, #${id} .submit`).removeClass('d-none');

            $(`#${id} .sortable`).sortable({
                axis: "y"
            }).disableSelection();
        });

        // Handle Cancel Button Click
        $(`#${id} .cancel`).on('click', function () {
            $(`#${id} .sortable`).sortable('destroy');
            $(`#${id} .cancel, #${id} .submit`).addClass('d-none');
            $(`#${id} .reorder`).removeClass('d-none');
        });

        // Handle Submit Button Click
        $(`#${id} .submit`).on('click', function () {
            let ndcNumbers = $(`#${id} .sortable tr`).map(function () {
                return $(this).data('ndc-number');
            }).get();

            let reqBody = {
                "sector_id": projects[0].Sector_id,
                "ndc_numbers": ndcNumbers
            };

            let cookieObject = getCookies(document.cookie);
            let jwt = cookieObject.jwt;
            let authHeader = { "Authorization": jwt };
            $.ajax({
                "type": "PATCH",
                "headers": authHeader,
                "contentType": "application/json",
                "data": JSON.stringify(reqBody),
                "url": `${apiUrl}/ndc/reorder`,
                "success": response => {
                    if (response.success) {
                        this.pageAlert(response.message, 1);
                        $(`#${id} .sortable`).sortable('destroy');
                        $(`#${id} .cancel, #${id} .submit`).addClass('d-none');
                        $(`#${id} .reorder`).removeClass('d-none');
                    }
                },
                "error": err => {
                    this.pageAlert(err.responseJSON.message, 0);
                    console.error(err);
                }
            });
        }.bind(this));

        // Make the table rows sortable
        // $(`#${id} .sortable`).sortable({
        //     update: function (event, ui) {
        //         let sortedIndices = $(this).sortable('toArray', { attribute: 'data-index' });
        //         console.log("New Order:", sortedIndices);
        //         // You can handle the new order here, e.g., update the backend with the new order
        //     }
        // });

        $(`#${id} .table-responsive .slider_box input[type='range']`).on('change', function (event) {
            let color = this.get_range_bar_color(+event.target.value);

            if (!$(event.target.parentElement).hasClass(color)) {
                $(event.target.parentElement).removeClass('min max medium');
                $(event.target.parentElement).addClass(color);
            }

        }.bind(this))

        // Initialize ionRangeSlider for dynamically generated inputs
        $(`#${id} .progress-slider`).each(function () {
            $(this).ionRangeSlider({
                min: 0,
                max: 100,
                postfix: "%",
                disable: true,
            });
        });

        if (add_string != '') {
            for (let j = 0; j < 20; j++) {
                $(`div#${category}_${j}_${add_string}`).find('span').removeClass('irs-disabled');
            }
        } else {
            for (let j = 0; j < 20; j++) {
                $(`div#${category}_${j}_`).find('span').removeClass('irs-disabled');
            }
        }

        $(`#${id}`).on('click', '.text-edit', function () {
            var editBtn = $(this);
            // var sector = editBtn.attr('data-category');
            var sector_id = projects[0].Sector_id
            var ndc_number = editBtn.attr('data-index');
            var countryId = editBtn.attr('data-countryId');
            var categoryId = editBtn.attr('data-categoryId');
            var slider = editBtn.closest('tr').find('.progress-slider');

            // Toggle between edit and save
            var buttonText = slider.prop('disabled') ? 'Save' : 'Edit';
            editBtn.text(buttonText);
            // Enable/disable the slider
            var sliderInstance = slider.data("ionRangeSlider");
            sliderInstance.update({
                disable: !slider.prop('disabled')
            });

            // If the button text is "Save", make the API call
            if (buttonText === 'Edit') {
                var categoryIndex = slider.attr('id').split('_'); // Extract category and index from the slider ID
                var category = categoryIndex[0];
                var index = categoryIndex[1];
                var value = slider.val();

                if (add_string != '') {
                    $(`div#${category}_${index}_${add_string}`).find('span').removeClass('irs-disabled');
                } else {
                    $(`div#${category}_${index}_`).find('span').removeClass('irs-disabled');
                }
                let reqBody = {
                    "value": value,
                }
                let cookieObject = getCookies(document.cookie);
                let jwt = cookieObject.jwt;
                let authHeader = { "Authorization": jwt };
                let path = `/ndc/manage?country_id=4&ndc_number=${ndc_number}&sector_id=${sector_id}&category_id=${categoryId}`;
                $.ajax({
                    "type": "PATCH",
                    "headers": authHeader,
                    "contentType": "application/json",
                    "data": JSON.stringify(reqBody),
                    "url": `${apiUrl}/${path}`,
                    "success": response => {
                        if (response.success) {
                            this.pageAlert(response.message, 1);
                        }
                    },
                    "error": err => {
                        this.pageAlert(err.responseJSON.message, 0);
                        console.error(err);
                    }
                });
            }
        });

        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
        var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl)
        })
    }

    get_range_bar_color(value) {
        if (value >= 0 && value < 25) {
            return 'min';
        } else if (value >= 25 && value < 100) {
            return 'medium';
        } else {
            return 'max';
        }
    }

    hasDecimal(number) {
        return number % 1 !== 0;
    }

    generateGoals(sdgArray) {
        let htmlContent = '';
        sdgArray.forEach(sdgValue => {
            if (Array.isArray(sdgValue)) {
                let sdgId = parseInt(sdgValue.toString().split('.')[0]);

                let indicators = this.sdg_indicators.filter(indicator => indicator.sdg_id == sdgId);
                let goal = this.sdg_goals.find(indicator => indicator.id == sdgId)?.goal;
                if (goal) {
                    let goal_html = '';
                    indicators.forEach(indicator => {
                        if (sdgValue.toString().includes(indicator.sdg_target_id)) {
                            goal_html += `<li data-bs-toggle="tooltip" data-bs-placement="bottom" title="${indicator.target}" class="p${sdgId} ms-0 active"></li>`;
                        } else {
                            goal_html += `<li data-bs-toggle="tooltip" data-bs-placement="bottom" title="${indicator.target}" class="p0 ms-0"></li>`;
                        }
                    });
                    htmlContent += `
                    <div class="d-flex justify-content-between align-items-center border-bottom mt-2">
                        <div>
                            <p class="mb-0">${goal}</p>
                            <p class=""></p>
                            <ul class="icon-list mb-0">${goal_html}</ul>
                            <p></p>
                        </div>
                        <div>
                            <span><img src="assets/images/sdgs/p${sdgId}.svg" alt="sdg" height="50px"></span>
                        </div>
                    </div>`;

                }
            } else {
                let hasDecimal = this.hasDecimal(sdgValue);
                let sdgId = hasDecimal ? parseInt(sdgValue.toString().split('.')[0]) : sdgValue;
                let indicators = this.sdg_indicators.filter(indicator => indicator.sdg_id == sdgId);

                let goal = this.sdg_goals.find(indicator => indicator.id == sdgId)?.goal;
                if (goal) {
                    let goal_html = '';
                    if (hasDecimal) {
                        for (let i = 0; i < indicators.length; i++) {
                            if (indicators[i].sdg_target_id == sdgValue) {
                                goal_html += `<li data-bs-toggle="tooltip" data-bs-placement="bottom" title="${indicators[i].target}" class="p${sdgId} ms-0 active"></li>`;
                            } else {
                                goal_html += `<li data-bs-toggle="tooltip" data-bs-placement="bottom" title="${indicators[i].target}" class="p0 ms-0"></li>`;
                            }
                        }
                    } else {
                        goal_html += indicators.map(indicator => `<li data-bs-toggle="tooltip" data-bs-placement="bottom" title="${indicator.target}" class="p${sdgId} ms-0"></li>`).join('');
                    }
                    htmlContent += `
                    <div class="d-flex justify-content-between align-items-center border-bottom mt-2">
                        <div>
                            <p class="mb-0">${goal}</p>
                            <p class=""></p>
                            <ul class="icon-list mb-0">${goal_html}</ul>
                            <p></p>
                        </div>
                        <div>
                            <span><img src="assets/images/sdgs/p${sdgId}.svg" alt="sdg" height="50px"></span>
                        </div>
                    </div>`;
                }
            }
        });
        return htmlContent;
    }

    getApi = (path) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "GET",
                "beforeSend": () => this.startWaiting(),
                "url": path,
                "success": response => resolve(response),
                "error": err => reject(err)
            })
        });
    }

    serverApi = (reqHead, path) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "GET",
                "headers": reqHead,
                "beforeSend": () => this.startWaiting(),
                "url": `${this.apiUrl}/${path}`,
                "success": response => resolve(response),
                "error": err => reject(err)
            })
        });
    }
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


