$(window).on("load", () => {
    let countryId = parseInt(getCookies(document.cookie).countryId) || parseInt(getCookies(document.cookie).initialCountryId);
    let projectTracker = new ProjectTracker(countryId);
    projectTracker.init();
});


class ProjectTracker{
    constructor(countryId){
        this.apiUrl = apiUrl;
        this.countryId = countryId;
        this.filterCountry = $("select#filter-country");
        this.selectedCountryId = this.filterCountry.val();
        this.captureButton = $("button#capture-btn");
        this.captureTarget = $("div#capture-target");

        this.masterGeoIndex = [
            {
                "id": 2,
                "status": 1,
                "country": "Zambia",
                "maps_folder": "zambia",
                "center_coordinates": [-13.1339, 27.8493],
                "geoIndex": [
                    {"folder": "projects", "type": "provinces", "name": "Provinces", "file": "provinces.topojson", "labelFields": ["Province"], "featureType": "Polygon", "fill": "transparent", "stroke": "black"},
                ],
                "provinceColors": [
                    {"province": "Southern", "color": "#F7DC6F"},
                    {"province": "Western", "color": "#3498DB"},
                    {"province": "Lusaka", "color": "#B03A2E"},
                    {"province": "Eastern", "color": "#BB8FCE"},
                    {"province": "Northern", "color": "#E59866"},
                    {"province": "Central", "color": "#E67E22"},
                    {"province": "Luapula", "color": "#78281F"},
                    {"province": "North-Western", "color": "#2ECC71"},
                    {"province": "Muchinga", "color": "#7E5109"},
                    {"province": "Copperbelt", "color": "#EC7063"}
                ]
            },
            {
                "id": 4,
                "status": 1,
                "country": "Sri Lanka",
                "maps_folder": "srilanka",
                "center_coordinates": [7.8731, 80.7718],
                "geoIndex": [
                    {"folder": "projects", "type": "provinces", "name": "Provinces", "file": "provinces.topojson", "labelFields": ["ADM1_EN"], "featureType": "Polygon", "fill": "transparent", "stroke": "black"},
                ],
                "provinceColors": [
                    {"province": "Central", "color": "#F7DC6F"},
                    {"province": "Eastern", "color": "#3498DB"},
                    {"province": "Northern", "color": "#B03A2E"},
                    {"province": "Southern", "color": "#BB8FCE"},
                    {"province": "Western", "color": "#E59866"},
                    {"province": "North Central", "color": "#E67E22"},
                    {"province": "Uva", "color": "#78281F"},
                    {"province": "Sabaragamuwa", "color": "#2ECC71"},
                    {"province": "North  Western", "color": "#7E5109"},
                    {"province": "North East Province", "color": "#EC7063"}
                ]
            },
            {
                "id": 7,
                "status": 1,
                "country": "Senegal",
                "maps_folder": "senegal",
                "center_coordinates": [14.4974, -14.4524],
                "geoIndex": [
                    {"folder": "projects", "type": "provinces", "name": "Provinces", "file": "regions.topojson", "labelFields": ["ADM1_FR"], "featureType": "Polygon", "fill": "transparent", "stroke": "black"},
                ],
                "provinceColors": [
                    {"province": "Dakar", "color": "#FF5733"},
                    {"province": "Petite CÃ´te", "color": "#33FF57"},
                    {"province": "the Saloum Delta", "color": "#3357FF"},
                    {"province": "Casamance", "color": "#FF33A8"},
                    {"province": "Saint-Louis", "color": "#A833FF"},
                    {"province": "Matam", "color": "#33FFF7"},
                    {"province": "Tambacounda", "color": "#FFA833"},
                    {"province": "Kedgou", "color": "#FF3333"},
                    {"province": "Kolda", "color": "#33FFA8"},
                    {"province": "Kedougou", "color": "#A8FF33"},
                    {"province": "Kaffrine", "color": "#5733FF"},
                    {"province": "Fatick", "color": "#FF3357"},
                    {"province": "Kaolack", "color": "#33A8FF"}
                ]
                
            },
            {
                "id": 5,
                "status": 1,
                "country": "Kenya",
                "maps_folder": "kenya",
                "center_coordinates": [-0.0236, 37.9062],
                "geoIndex": [
                    {"folder": "projects", "type": "provinces", "name": "Provinces", "file": "counties.topojson", "labelFields": ["ADM1_EN"], "featureType": "Polygon", "fill": "transparent", "stroke": "black"},
                ],
                "provinceColors": [
                    {"province": "Baringo", "color": "#E57373"},
                    {"province": "Bomet", "color": "#F06292"},
                    {"province": "Busia", "color": "#BA68C8"},
                    {"province": "Coast", "color": "#9575CD"},
                    {"province": "Eastern", "color": "#7986CB"},
                    {"province": "Elgeyo Marakwet", "color": "#64B5F6"},
                    {"province": "Garissa", "color": "#4FC3F7"},
                    {"province": "Isiolo", "color": "#4DD0E1"},
                    {"province": "Kajiado", "color": "#4DB6AC"},
                    {"province": "Kakamega", "color": "#81C784"},
                    {"province": "Kericho", "color": "#AED581"},
                    {"province": "Kilifi", "color": "#DCE775"},
                    {"province": "Kisumuz", "color": "#FFF176"},
                    {"province": "Kitui", "color": "#FFD54F"},
                    {"province": "Kwale", "color": "#FFB74D"},
                    {"province": "Laikipia", "color": "#FF8A65"},
                    {"province": "Lamu", "color": "#A1887F"},
                    {"province": "Machakos", "color": "#E0E0E0"},
                    {"province": "Makueni", "color": "#90A4AE"},
                    {"province": "Mandera", "color": "#F44336"},
                    {"province": "Marsabit", "color": "#E91E63"},
                    {"province": "Meru", "color": "#9C27B0"},
                    {"province": "Migori", "color": "#673AB7"},
                    {"province": "Mombasa", "color": "#3F51B5"},
                    {"province": "Murang'a", "color": "#2196F3"},
                    {"province": "Nairobi", "color": "#03A9F4"},
                    {"province": "Nakuru", "color": "#00BCD4"},
                    {"province": "Nandi", "color": "#009688"},
                    {"province": "Narok", "color": "#4CAF50"},
                    {"province": "North Eastern", "color": "#8BC34A"},
                    {"province": "Nyamira", "color": "#CDDC39"},
                    {"province": "Nyandarua", "color": "#FFEB3B"},
                    {"province": "Nyeri", "color": "#FFC107"},
                    {"province": "Rift valley", "color": "#FF9800"},
                    {"province": "Samburu", "color": "#FF5722"},
                    {"province": "Siaya", "color": "#795548"},
                    {"province": "Siaya", "color": "#9E9E9E"},
                    {"province": "Taita-Tavetac", "color": "#607D8B"},
                    {"province": "Tana River", "color": "#D32F2F"},
                    {"province": "Tharaka Nithi", "color": "#C2185B"},
                    {"province": "Trans-Nzoia", "color": "#7B1FA2"},
                    {"province": "Turkana", "color": "#512DA8"},
                    {"province": "Uasin Gishu", "color": "#303F9F"},
                    {"province": "Vihiga", "color": "#1976D2"},
                    {"province": "Wajir", "color": "#0288D1"},
                    {"province": "West Pokot", "color": "#0097A7"},
                    {"province": "Western Kenya", "color": "#00796B"}
                ]
                
            }
            
        ];

        this.pieColors = {
            "Adaptation": "#fef0f4",
            "Mitigation": "#e3eff8",
            "Cross-cutting": "#feeed2",
        };

        this.polygonFillIndex = [
            { category: 'adaptation', color: 'rgb(255,255,204)', label: 'Very Low' },
            { category: 'adaptation', color: 'rgb(161,218,180)', label: 'Low' },
            { category: 'adaptation', color: 'rgb(65,182,196)', label: 'Medium' },
            { category: 'adaptation', color: 'rgb(44,127,184)', label: 'High' },
            { category: 'adaptation', color: 'rgb(37,52,148)', label: 'Very High' },
            { category: 'mitigation', color: 'rgb(241,238,246)', label: 'Very Low' },
            { category: 'mitigation', color: 'rgb(189,201,225)', label: 'Low' },
            { category: 'mitigation', color: 'rgb(116,169,207)', label: 'Medium' },
            { category: 'mitigation', color: 'rgb(43,140,190)', label: 'High' },
            { category: 'mitigation', color: 'rgb(4,90,141)', label: 'Very High' },
            { category: 'crosscutting', color: 'rgb(240,249,232)', label: 'Very Low' },
            { category: 'crosscutting', color: 'rgb(186,228,188)', label: 'Low' },
            { category: 'crosscutting', color: 'rgb(123,204,196)', label: 'Medium' },
            { category: 'crosscutting', color: 'rgb(67,162,202)', label: 'High' },
            { category: 'crosscutting', color: 'rgb(8,104,172)', label: 'Very High' }
        ];
        this.mapAdaptationId = "map-adaptation";
        this.mapMitigationId = "map-mitigation";
        this.mapCrossCuttingId = "map-crosscutting";

        this.mapAdaptation = null;
        this.mapMitigation = null;
        this.mapCrossCutting = null;

        this.cookieObject = getCookies(document.cookie);
        this.jwt = this.cookieObject.jwt;
        this.userEmail = this.cookieObject.userEmail;
        this.isLoggedIn = this.cookieObject.isLoggedIn;
        this.userRoleId = this.cookieObject.userRoleId;
        this.initialCountryId = this.cookieObject.initialCountryId;
        this.authHeader = {"Authorization": this.jwt};
        this.logoutLink = $("a#link-logout");
        this.userMgmtLink = $("li#user-management-link");
        this.loggedInUserEmailLabel = $("li#user-email-label");
        this.userCountryIcon = $("img#user-country-icon");
        this.labelCountry = $("span.label-country");
    }

    init = () => {
        this.logoutLink.on("click", this.onLogoutClick);
        // this.userRoleId == 1 ? this.filterCountry.show() : this.filterCountry.hide();
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.filterCountry.on("change", () => {
            this.selectedCountryId = this.filterCountry.val();
            this.countryId = this.selectedCountryId;
            document.cookie = `countryId=${this.selectedCountryId}`;
            this.countryInfo = this.masterGeoIndex.find(a => a.id == this.selectedCountryId);
            this.labelCountry.empty().html(this.countryInfo.country);
            this.execute();
        });
        this.userRoleId != 1
            ? this.filterCountry.val(this.initialCountryId).trigger("change")
            : this.filterCountry.val(this.countryId).trigger("change");
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
    }

    execute = () => {
        if(this.isLoggedIn){
            this.fetchData();
            this.initiateMapContainers();
            this.userRoleId != 1
                ? this.userCountryIcon.attr("src", `./assets/flag_icons/${this.initialCountryId}.png`).attr("title", flagIndex[this.initialCountryId]).show()
                : this.userCountryIcon.attr("src", null).hide();
        } else{
            this.userCountryIcon.attr("src", null).attr("title", null).hide();
        }
    }


    initiateMapContainers = () => {
        // Adaptation
        if(this.mapAdaptation != undefined || this.mapAdaptation != null) {this.mapAdaptation.remove(); this.mapAdaptation.off();}
        this.mapAdaptation = L.DomUtil.get(this.mapAdaptationId);
        if(this.mapAdaptation != null) this.mapAdaptation._leaflet_id = null;
        this.mapAdaptation = L.map(this.mapAdaptationId, {zoomControl: false, attributionControl: false});
        // Mitigation
        if(this.mapMitigation != undefined || this.mapMitigation != null) {this.mapMitigation.remove(); this.mapMitigation.off();}
        this.mapMitigiation = L.DomUtil.get(this.mapMitigiationId);
        if(this.mapMitigiation != null) this.mapMitigiation._leaflet_id = null;
        this.mapMitigation = L.map(this.mapMitigationId, {zoomControl: false, attributionControl: false});
        // Cross-Cutting
        if(this.mapCrossCutting != undefined || this.mapCrossCutting != null) {this.mapCrossCutting.remove(); this.mapCrossCutting.off();}
        this.mapCrossCutting = L.DomUtil.get(this.mapCrossCuttingId);
        if(this.mapCrossCutting != null) this.mapCrossCutting._leaflet_id = null;
        this.mapCrossCutting = L.map(this.mapCrossCuttingId, {zoomControl: false, attributionControl: false});
        // Common
        [this.mapAdaptation, this.mapMitigation, this.mapCrossCutting].forEach(a => {
            a.touchZoom.disable();
            a.doubleClickZoom.disable();
            a.scrollWheelZoom.disable();
            a.boxZoom.disable();
            a.dragging.disable();
        })
    }

    onLogoutClick = () => {
        document.cookie = `userEmail=null`;
        document.cookie = `jwt=null`;
        document.cookie = `isLoggedIn=false`;
        document.cookie = `userRoleId=null`;
        document.cookie = `initialCountryId=null`;
        window.location.replace("index.html");
    }

    colorSankey = (sankeyData) => {
        let colorIndex = this.masterGeoIndex.find(b => b.id == this.selectedCountryId).provinceColors;
        let coloredSankeyData = sankeyData.map(a => {
            let colorCode = colorIndex.find(b => b.province == a[0])?.color;
            return {
                "from": a[0],
                "to": a[1],
                "weight": a[2],
                "color": colorCode
            };
        })
        return coloredSankeyData;
    }

    colorSunburst = (sunburstData) => {
        let colorIndex = this.masterGeoIndex.find(b => b.id == this.selectedCountryId).provinceColors;
        let inputSunburstData = structuredClone(sunburstData);
        let level1Data = inputSunburstData.find(b => b.id == "0.0")
        level1Data.color = "white";
        let level2data = inputSunburstData.filter(b => b.parent == "0.0").map(b => {
            let colorCode = colorIndex.find(c => c.province == b.name).color;
            return {...b, "color": colorCode};
        })
        let level3Data = level2data.filter(b => b.id != "0.0").map(b => {
            let children = inputSunburstData.filter(c => c.parent == b.id)
            return children.map(c => {
                return {...c, "color": b.color}
            });
        });
        return [level1Data, ...level2data, ...level3Data.flat(1)];
    }

    colorPie = (pieData) => {
        pieData.forEach(a => a["color"] =  this.pieColors[a.drilldown["name"]])
    }

    fetchData = () => {
        let reqBody = {"country_id": Number(this.countryId)}
        this.postApi(reqBody, this.authHeader, "projects/tracker")
        .then(response => {
            let summaryData = response.data.category_data;
            this.renderCounts(summaryData);
            let sunburstData = response.data.sunburst_data.length ? response.data.sunburst_data : null;
            let coloredSunburstData = this.colorSunburst(sunburstData);
            this.plotSunBurstChart(coloredSunburstData);
            let sankeyData = response.data.sankey_data.length ? response.data.sankey_data : null;
            let coloredSankeyData = this.colorSankey(sankeyData);
            this.plotSankeyChart(coloredSankeyData);
            let pieData = response.data.pie_data.length ? response.data.pie_data : null;
            let coloredPieData = pieData.map(a => {
                return {...a, "color": this.pieColors[a.drilldown["name"]]}
            });
            this.plotPieChart(coloredPieData);
            let mapData = response.data.map_data.length ? response.data.map_data : null;
            this.loadTopojson(mapData);
        })
        .then(() => this.enableScreenshot())
        .catch(err => {
            console.error(err);
            this.pageAlert(err.responseJSON.message, 0);
            if(err.status == 401) {
                this.onLogoutClick();
            }
        })
        .finally(() => this.stopWaiting());
    }

    loadTopojson = (mapData) => {
        this.loadMapFile(this.countryInfo)
        .then(topoResponse => {
            let geoData = topojson.feature(topoResponse, topoResponse.objects.collection);
            geoData.features.forEach(a => {
                a.properties.adaptation_count = mapData.find(b => b.province_id == a.properties.province_id && b.category == "Adaptation")?.count || 0;
                a.properties.mitigation_count = mapData.find(b => b.province_id == a.properties.province_id && b.category == "Mitigation")?.count || 0;
                a.properties.crosscutting_count = mapData.find(b => b.province_id == a.properties.province_id && b.category == "Cross-cutting")?.count || 0;
            })
            this.drawMap(this.mapAdaptation, geoData, "adaptation")
            this.drawMap(this.mapMitigation, geoData, "mitigation")
            this.drawMap(this.mapCrossCutting, geoData, "crosscutting")
        })
        .catch(err => {
            this.pageAlert(`Unable to get map`, 0);
            console.error(err)
        })
        .finally(() => this.stopWaiting())
    }

    removeSvg = (mapObj, category) => {
        mapObj.eachLayer(l => {
            if(l.options.id && l.options.id.indexOf(`${category}-layer`) === 0) mapObj.removeLayer(l);
        })
    }

    drawMap = (mapObj, geoData, category) => {
        let polygonFillIndex = this.variableColorRange(
            this.polygonFillIndex.filter(b => b.category == category),
            geoData.features.map(b => b.properties),
            `${category}_count`
        );
        this.removeSvg(mapObj, category);
        let bounds = L.geoJson(geoData, {}).getBounds();
        mapObj.fitBounds(bounds);
        let tooltip;
        let polygons = L.d3SvgOverlay((selection, projection) => {
            let pScale = projection.scale;
            let locationGroup = selection.selectAll("path").data(geoData.features);
            locationGroup.enter()
                .append("path")
                .attr("d", d => projection.pathFromGeojson(d))
                .attr("id", (d, i) => `${category}-province${i}`)
                .attr("style", "z-index:2000;pointer-events:visiblePainted !important")
                .attr("fill", d => this.getPolygonColorByValue(d.properties[`${category}_count`], polygonFillIndex))
                .attr("stroke", "black")
                .attr("stroke-width", "0.5px")
                .attr("fill-opacity", 0.75)
                .on("mouseenter", (e, d) => {
                    let tooltipContent = `
                        <span>${d.properties[this.countryInfo.geoIndex[0].labelFields[0]]}</span><br/>
                        <span>Projects: ${d.properties[`${category}_count`]}</span>
                    `;
                    tooltip = projection.layer.bindTooltip(tooltipContent).openTooltip(
                        L.latLng(projection.layerPointToLatLng(projection.pathFromGeojson.centroid(d)))
                    );
                })
                .on("mouseleave", (e, d) => {
                    tooltip?.closeTooltip();
                });

            locationGroup.transition().duration(10).attr("stroke-width", `${0.5/pScale}px`);
        }, {id: `${category}-layer`});
        polygons.addTo(mapObj);
    }

    variableColorRange = (polygonFillIndex, properties, field) => {
        let colorRanges = [];
        let colors = polygonFillIndex.map(a => a.color);
        let numbers = properties.map(a => a[field]);
        numbers.sort((a, b) => a - b);
        let numbersPerColor = Math.ceil(numbers.length / colors.length);
        
        for (let i = 0; i < colors.length; i++) {
            let color = colors[i];
            let startIndex = i * numbersPerColor;
            let endIndex = Math.min((i + 1) * numbersPerColor - 1, numbers.length - 1);
            let min = numbers[startIndex];
            let max = numbers[endIndex];
            let colorRange = {
                min: min,
                max: max,
                color: color,
                label: min != max ? `${min}-${max}` : `${max}`
            };
            colorRanges.push(colorRange);
        }
        
        polygonFillIndex.forEach(a => {
            let item = colorRanges.find(b => b.color === a.color);
            a.max = item.max;
            a.min = item.min;
            a.label = item.label;
        });
        
        return polygonFillIndex;
    }

    getPolygonColorByValue = (value, polygonFillIndex) => polygonFillIndex.find(b => b.min <= value && b.max >= value)?.color || "transparent"


    renderCounts = (summaryData) => {
        let adaptation = summaryData.find(a => a.category == "Adaptation");
        $("h4#count-adaptation-beneficiaries").empty().html(strNum(adaptation.beneficiaries));
        $("h4#count-adaptation-funds").empty().html(strNum(adaptation.funds));
        $("h4#count-adaptation-projects").empty().html(strNum(adaptation.projects));
        $("span#count-adaptation-beneficiaries").empty().html(strNum(adaptation.beneficiaries));
        $("span#count-adaptation-funds").empty().html(strNum(adaptation.funds));
        $("span#count-adaptation-projects").empty().html(strNum(adaptation.projects));
        let mitigation = summaryData.find(a => a.category == "Mitigation");
        $("h4#count-mitigation-beneficiaries").empty().html(strNum(mitigation.beneficiaries));
        $("h4#count-mitigation-funds").empty().html(strNum(mitigation.funds));
        $("h4#count-mitigation-projects").empty().html(strNum(mitigation.projects));
        $("span#count-mitigation-beneficiaries").empty().html(strNum(mitigation.beneficiaries));
        $("span#count-mitigation-funds").empty().html(strNum(mitigation.funds));
        $("span#count-mitigation-projects").empty().html(strNum(mitigation.projects));
        let crosscutting = summaryData.find(a => a.category == "Cross-cutting");
        $("h4#count-crosscutting-beneficiaries").empty().html(strNum(crosscutting.beneficiaries));
        $("h4#count-crosscutting-funds").empty().html(strNum(crosscutting.funds));
        $("h4#count-crosscutting-projects").empty().html(strNum(crosscutting.projects));
        $("span#count-crosscutting-beneficiaries").empty().html(strNum(crosscutting.beneficiaries));
        $("span#count-crosscutting-funds").empty().html(strNum(crosscutting.funds));
        $("span#count-crosscutting-projects").empty().html(strNum(crosscutting.projects));
        let allCategories = summaryData.find(a => a.category == "All-Categories");
        $("span#count-total-beneficiaries").empty().html(strNum(allCategories.beneficiaries));
        $("span#count-total-funds").empty().html(strNum(allCategories.funds));
        $("span#count-total-projects").empty().html(strNum(allCategories.projects));
    }

    plotSunBurstChart = (chartData) => { 
        if(chartData.length){
            Highcharts.chart('chart-sunburst', {
                chart: {
                    backgroundColor: 'transparent',
                    events: {
                        render: function() {
                            const chart = this;
                            chart.series[0].points.forEach(point => {
                                if(point.node.level === 3){
                                    point.graphic.css({opacity: 0.5});
                                }
                            })
                        }
                    }
                },
                dataLabels: {style: {textShadow: false}},
                // colors: ['#fa4b42'].concat(Highcharts.getOptions().colors),
                title: {text: null},
                subtitle: {text: null},
                credits: {enabled: false},
                exporting: {enabled: true},
                tooltip: {
                    formatter: function () {
                        let value = this.point.value;
                        let formattedValue = 
                            value >= 1e9 ? (value / 1e9).toFixed(2) + ' B' :
                            value >= 1e6 ? (value / 1e6).toFixed(2) + ' M' :
                            value >= 1e3 ? (value / 1e3).toFixed(2) + ' K' :
                            value;
                        return  `${this.key}: <b>${formattedValue}</b>`;
                    }
                },
                series: [
                    {
                        type: 'sunburst',
                        data: chartData,
                        allowDrillToNode: true,
                        name: "Project Distribution",
                        borderRadius: 3,
                        levels: [
                            {
                                level: 1,
                                levelIsConstant: false,
                                colorByPoint: true,
                                dataLabels: {
                                    filter: {
                                        property: 'outerArcLength',
                                        operator: '>',
                                        value: 64
                                    },
                                    color: 'black',
                                    style: {
                                        textOutline: 'none' 
                                    }
                                }
                            }, 
                            {
                                level: 2,
                                colorByPoint: true,
                                colorVariation: {
                                    key: 'opacity',
                                    to: -0.5
                                },
                                dataLabels: {
                                    color: 'black',
                                    style: {
                                        textOutline: 'none' 
                                    }
                                }
                            },
                            {
                                level: 3,
                                dataLabels: {
                                    color: 'black',
                                    style: {
                                        textOutline: 'none' 
                                    }
                                }
                            }
                        ]
                    }
                ]
            });
        }    else $(`div#chart-sunburst`).empty().html(`<div class="text-center mt-5">Data unavailable</div>`);
    }

    plotSankeyChart = (chartData) => {
        if(chartData.length){
            let data = chartData.map(a => {return {"from": a.from, "to": a.to, "weight": a.weight}});
            let nodes = chartData.map(a => {return {"id": a.from, "name": a.from, "color": a.color}})
            Highcharts.chart("chart-sankey", {
                chart: {backgroundColor: 'transparent',},
                title: {text: null},
                subtitle: {text: null},
                credits: {enabled: false},
                navigation: {
                    buttonOptions: {
                        verticalAlign: 'top',
                        y: -10
                    }
                },
                exporting: {enabled: true},
                plotOptions: {
                    sankey: {
                        dataLabels: {
                            // align: 'right', // Adjust horizontal alignment
                            verticalAlign: 'middle', // Adjust vertical alignment
                            padding: 5, // Add padding to the labels
                            color: 'black',
                            style: {
                                textOutline: 'none' 
                            }
                        }
                    }
                },
                tooltip: {
                    formatter: function(){
                        if(this.point.options.isNode){
                            return this.point.options.id
                        } else{
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
                series: [{
                    type: 'sankey',
                    name: 'Climate Hazards',
                    colorByPoint: true,
                    data: data,
                    nodes: nodes

                }],
            });
        } else $(`div#chart-sankey`).empty().html(`<div class="text-center mt-5">Data unavailable</div>`);
    }

    plotPieChart = (chartData) => {
        if(chartData.length){
            let categoryData = chartData.map(a => {
                return {"name": a.drilldown.name, "y": a.y, "color": a.color };
            });
            let statusData = chartData.map(a => {
                return a.drilldown.categories.map((b, i) => {
                    let brightness = 0.2 - (i+1)/5;
                    return {
                        "name": b,
                        "y": a.drilldown.data[i],
                        "color": Highcharts.color(a.color).brighten(brightness).get()
                    }
                })
                
            }).flat(2);
            
            Highcharts.chart('chart-pie', {
                chart: {
                    type: 'pie',
                    backgroundColor: 'transparent'
                },
                title: {
                    text: '',
                    align: 'left'
                },
                credits:{
                    enabled: false
                },
                plotOptions: {
                    pie: {
                        shadow: false,
                        center: ['50%', '50%']
                    }
                },
                tooltip: {
                    valueSuffix: null
                },
                series: [{
                    name: 'Categories',
                    data: categoryData,
                    size: '45%',
                    dataLabels: {
                        color: '#000',
                        distance: '-50%',
                        style: {
                            textOutline: 'none'
                        }
                    }
                }, {
                    name: 'Status',
                    data: statusData,
                    size: '80%',
                    innerSize: '60%',
                    dataLabels: {
                        format: '<b>{point.name}:</b> {y}',
                        distance: '-40',
                        style: {
                            textOutline: 'none'
                        }
                    }
                }],
            });
        } else $(`div#chart-pie`).empty().html(`<div class="text-center mt-5">Data unavailable</div>`);
    }

    enableScreenshot = () => {
		this.captureButton.on('click', () => {
			this.startWaiting();
			const container = document.querySelector('div#capture-target');;
			if (container) {
				const options = {
					quality: 1,
					width: container.offsetWidth,
					height: container.offsetHeight
				};
				domtoimage.toJpeg(container, options)
				.then(dataUrl => {
					const img = new Image();
					img.src = dataUrl;
					const link = document.createElement('a');
					link.href = dataUrl;
					link.download = 'screenshot.jpeg';
					link.click();
				})
				.catch(error => {
					console.error('Screenshot capture error: ', error);
				})
				.finally(this.stopWaiting);
			} else {
			console.error('Invalid capture target. Ensure that the capture target is a valid DOM element.');
			this.stopWaiting();
			}
		});
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

    loadMapFile = (countryInfo) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "GET",
                "beforeSend": () => this.startWaiting(),
                "url": `./assets/vector_maps/${countryInfo.maps_folder}/projects/${countryInfo.geoIndex[0].file}`,
                "success": response => typeof(response) == "string" ? resolve(JSON.parse(response)) : resolve(response),
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

    uqArray = (arr) => [...new Set(arr)];

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