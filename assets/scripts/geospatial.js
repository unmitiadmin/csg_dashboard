$(window).on("load", () => {
    let userRoleId = parseInt(getCookies(document.cookie).userRoleId);
    let countryId = userRoleId == 1
        ? parseInt(getCookies(document.cookie).countryId)
        : parseInt(getCookies(document.cookie).initialCountryId);
    let filterCountry = $("select#filter-country");
    // userRoleId == 1 ? filterCountry.show() : filterCountry.hide();
    filterCountry.on("change", () => {
        $("div#map-id").empty();
        $("div#map-legend").empty();
        let chosenCountryId = filterCountry.val();
        document.cookie = `countryId=${chosenCountryId}`;
        if (chosenCountryId == 4) new SrilankaGeoSpatial().init();
        if (chosenCountryId == 2) new ZambiaGeoSpatial().init();
        if (chosenCountryId == 7) new SenegalGeoSpatial().init();
        if (chosenCountryId == 5) new KenyaGeoSpatial().init();
    });
    filterCountry.val(countryId).trigger("change");
});


class SrilankaGeoSpatial {
    constructor() {
        this.apiUrl = apiUrl;
        this.lookupsReqBody = lookupsReqBody;
        this.countryId = 4;
        this.country = "Sri Lanka";
        this.mapsFolder = "srilanka";
        this.centerCoordinates = [7.8731, 80.7718];
        this.vectorIndex = [];
        this.polygonFillIndex = [];
        this.resourceLayerIndex = [];
        this.mapProjectData = [];
        this.lookupData = [];

        // cookies
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

        // map variables
        this.map = null;
        this.mapContainerId = "map-id";
        this.mapContainer = $("div#map-id");
        this.geoserverHost = "https://csg.iwmi.org";
        this.currentWmsLayer = null;
        this.backgroundTilesLayer = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png";
        this.pointMarkerLayers = {};
        this.mapLegend = $("div#map-legend");
        this.descProjectList = $("div#map-project-list");
        this.descCitation = $("div#map-layer-citation");

        // option holders
        this.optionsAdmin = $("ul#options-admin");
        this.optionsInfrastructure = $("ul#options-infrastructure");
        this.optionsHydrology = $("ul#options-hydrology");
        this.optionsHazard = $("ul#options-hazard");
        this.accordionLabelHazard = $("li#parent-label-hazard");
        this.optionsRisk = $("ul#options-risk");
        this.accordionLabelRisk = $("li#parent-label-risk");
        this.optionsResourceLayer = $("ul#options-resource-layer");
        this.optionsProjects = $("ul#options-projects");

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

    init = () => {
        // this.mapLegend.hide();
        // this.descProjectList.empty();
        // this.descCitation.empty();
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.logoutLink.on("click", this.onLogoutClick);
        if (this.isLoggedIn) {
            this.userRoleId != 1
                ? this.userCountryIcon.attr("src", `./assets/flag_icons/4.png`).attr("title", flagIndex[4]).show()
                : this.userCountryIcon.attr("src", null).attr("title", null).hide();
            if (this.map != undefined || this.map != null) {
                this.map.remove();
                this.map.off();
            };
            this.mapContainerElement = L.DomUtil.get(this.mapContainerId);
            if (this.mapContainerElement != null) this.mapContainerElement._leaflet_id = null;
            this.map = L.map(this.mapContainerId, { attributionControl: false, fullscreenControl: true, zoomControl: false });
            L.control.zoom({ position: "topright" }).addTo(this.map);
            this.streetLayer = L.tileLayer(this.backgroundTilesLayer, { maxZoom: 15, opacity: 1 });
            this.streetLayer.addTo(this.map);
            this.map.setView(this.centerCoordinates, 7.5);
            this.map.touchZoom.disable();
            this.map.doubleClickZoom.disable();
            this.map.scrollWheelZoom.disable();
            this.map.boxZoom.disable();
            this.loadData();
        } else {
            this.userCountryIcon.attr("src", null).attr("title", null).hide();
        }
    }

    loadData = () => {
        Promise.allSettled([
            this.postApi({ "country_id": this.countryId }, this.authHeader, "projects/tracker"),
            this.loadExcelFile("srilanka_layer_index.xlsx"),
            this.postApi(this.lookupsReqBody, null, "projects/lookups")
        ])
            .then(responses => {
                responses.forEach((response, i) => {
                    switch (true) {
                        case i == 0: // Projects data
                            if (response.status == "fulfilled") this.mapProjectData = response.value.data.map_data;
                            else this.pageAlert("Issue in getting projects' data from API", 0);
                            break;
                        case i == 1: // Country's layer index
                            if (response.status == "fulfilled") {
                                [this.vectorIndex, this.polygonFillIndex, this.resourceLayerIndex]
                                    = this.excelToArray(response.value, "vectorIndex", "polygonFillIndex", "resourceLayerIndex");
                                this.polygonFillIndex.forEach(a => {
                                    if (a.min !== null && a.max !== null) {
                                        a.min = this.float2(a.min);
                                        a.max = this.float2(a.max);
                                    }
                                })
                            } else this.pageAlert("Issue in loading Sri Lanka's layer index sheet", 0);
                            break;
                        case i == 2: // Project lookup data
                            if (response.status == "fulfilled") this.lookupData = response.value.data;
                            else this.pageAlert("Issue in loading the project lookup data", 0);
                            break;
                        default:
                            break;
                    }
                });
            })
            .then(this.fillLayerOptions)
            .then(() => {
                $(`input[name='option-admin'][type='checkbox'][value='provinces']`).prop("checked", true).trigger("change");
                $(`input[name='option-projects'][type='checkbox'][value='adaptation']`).prop("checked", true).trigger("change");
                $(`input[name='option-infrastructure'][type='checkbox'][value='towns']`).prop("checked", true).trigger("change");
            })
            .catch(err => {
                console.error(err);
                this.pageAlert("Issue in loading initial data, please contact dev team", 0);
            })
            .finally(this.stopWaiting);
    }

    fillLayerOptions = () => {
        // 1. Admin - Transparent Polygons
        let adminDetails = this.vectorIndex.filter(a => a.folder == "admin" && a.status);
        let adminOptions = adminDetails.map((a, i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input" id="option-${a.folder}-${i}" name="option-${a.folder}" value="${a.type}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"></label>
                </div>
            </li>`;
        }).join("\n");
        this.optionsAdmin.empty().html(adminOptions);
        $("input[name='option-admin'][type='checkbox']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
        });

        // 2. Projects
        let projectDetails = this.vectorIndex.filter(a => a.folder == "projects" && a.status);
        let projectOptions = projectDetails.map((a,i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>

                <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input" id="option-${a.folder}-${i}" name="option-${a.folder}" value="${a.type}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"></label>
                </div>
            </li>`;
        }).join("\n");
        this.optionsProjects.empty().html(projectOptions);
        $("input[name='option-projects'][type='checkbox']").on("change", e => {
            let layerName = $(e.currentTarget).val();
            let layerDetails = this.vectorIndex.find(b => b.type == layerName);
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
            let otherLayerTypes = this.vectorIndex.filter(b => ["risk", "hazard", "projects"].includes(b.folder) && b.type != layerName);
            otherLayerTypes.forEach(a => this.removeSvgGroupById(a.type));
            $("input[name='option-risk'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-hazard'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-resource-layer'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-projects'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            if (this.currentWmsLayer) {
                this.map.removeLayer(this.currentWmsLayer);
                this.currentWmsLayer = null;
            }
            let allFillPolygonsUnchecked = (
                !$("input[name='option-hazard'][type='checkbox']:checked").length &&
                !$("input[name='option-risk'][type='checkbox']:checked").length &&
                !$("input[name='option-projects'][type='checkbox']:checked").length &&
                !$("input[name='option-resource-layer'][type='checkbox']:checked").length
            );
            if (allFillPolygonsUnchecked) this.mapLegend.empty();

            let allProjectPolygonUnchecked = $("input[name='option-projects'][type='checkbox']:checked").length
            if (!allProjectPolygonUnchecked) this.descProjectList.empty().hide();
        });


        // 3. Hydrology
        let hydrologyDetails = this.vectorIndex.filter(a => a.folder == "hydrology" && a.status);
        let hydrologyOptions = hydrologyDetails.map((a,i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                        ${a.featureType == "Point" ? `&nbsp;<img height='16px' width='16px' src='assets/images/geospatial-icons/${a.type}.png'>` : ""}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input" id="option-${a.folder}-${i}" name="option-${a.folder}" value="${a.type}" data-feature-type="${a.featureType}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"></label>
                </div>
            </li>`;
        }).join("\n");
        this.optionsHydrology.empty().html(hydrologyOptions);
        // Hydrology - Polygon
        $("input[name='option-hydrology'][type='checkbox'][data-feature-type='Polygon']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
        });
        // Hydrology - LineString
        $("input[name='option-hydrology'][type='checkbox'][data-feature-type='LineString']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
        });
        // Hydrology - Point
        $("input[name='option-hydrology'][type='checkbox'][data-feature-type='Point']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removePointMarkers(`point-${layerDetails.type}`);
        });

        // 4. Infrastructure
        let infrastructureDetails = this.vectorIndex.filter(a => a.folder == "infrastructure" && a.status);
        let infrastructureOptions = infrastructureDetails.map((a, i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                        ${a.featureType == "Point" ? `&nbsp;<img height='16px' width='16px' src='assets/images/geospatial-icons/${a.type}.png'>` : ""}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                 <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input" id="option-${a.folder}-${i}" name="option-${a.folder}" value="${a.type}" data-feature-type="${a.featureType}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"></label>
                </div>
            </li>`;
        }).join("\n");
        this.optionsInfrastructure.empty().html(infrastructureOptions);
        // Infrastructure - LineString
        $("input[name='option-infrastructure'][type='checkbox'][data-feature-type='LineString']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
        });
        // Infrastructure - Point
        $("input[name='option-infrastructure'][type='checkbox'][data-feature-type='Point']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removePointMarkers(`point-${layerDetails.type}`);
        });

        // 5. Hazard - Filled Polygon
        let hazardDetails = this.vectorIndex.filter(a => a.folder == "hazard" && a.status);
        this.accordionLabelHazard.empty().html(`
            <a class="link_name btn btn_redirect" href="geospatial_compare_view.html?criteria=hazard&country_id=4" target="_blank" 
                 style="color: #fff!important;font-size: 12px!important;padding: 3px 32.5px !important;text-align: center;">
                Comparison View 
                <span><img src="assets/images/arrow_down.svg"></span>
            </a>
        `);
        let hazardOptions = hazardDetails.map((a, i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input" role="switch" id="option-${a.folder}-${i}" name="option-${a.folder}" value="${a.type}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"></label>
                </div>
            </li>`;
        }).join("\n");
        this.optionsHazard.empty().html(hazardOptions);
        $("input[name='option-hazard'][type='checkbox']").on("change", e => {
            let layerName = $(e.currentTarget).val();
            let layerDetails = this.vectorIndex.find(b => b.type == layerName);
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
            let otherLayerTypes = this.vectorIndex.filter(b => ["risk", "hazard", "projects"].includes(b.folder) && b.type != layerName);
            otherLayerTypes.forEach(a => this.removeSvgGroupById(a.type))
            $("input[name='option-hazard'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-risk'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-projects'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-resource-layer'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            if (this.currentWmsLayer) {
                this.map.removeLayer(this.currentWmsLayer);
                this.currentWmsLayer = null;
            }
            let allFillPolygonsUnchecked = (
                !$("input[name='option-projects'][type='checkbox']:checked").length &&
                !$("input[name='option-hazard'][type='checkbox']:checked").length &&
                !$("input[name='option-risk'][type='checkbox']:checked").length &&
                !$("input[name='option-resource-layer'][type='checkbox']:checked").length
            );
            if (allFillPolygonsUnchecked) this.mapLegend.empty();

            let oneHazardProjectSelected = $("input[name='option-hazard'][type='checkbox']:checked:not([value='multi_hazard'])").length;
            if (oneHazardProjectSelected && layerDetails.refText) {
                this.descCitation.empty().html(`<div class="p-2">${layerDetails.refText}</div>`).show();
            } else this.descCitation.empty().hide();
        });

        // 6. Risk Indicator - Filled Polygon
        let riskDetails = this.vectorIndex.filter(a => a.folder == "risk" && a.status);
        let riskGroups = this.uqArray(riskDetails.map(a => a.group));
        this.accordionLabelRisk.empty().html(`
            <a class="link_name btn btn_redirect" href="geospatial_compare_view.html?criteria=risk&country_id=4" target="_blank" 
                style="color: #fff!important;font-size: 12px!important;padding: 3px 32.5px !important;text-align: center;">
                Comparison View 
                <span><img src="assets/images/arrow_down.svg"></span>
            </a>
        `);
        let riskOptions = riskGroups.map((a, i) => {
            let riskGroupOptions = riskDetails.filter(b => b.group == a).map((b, j) => {
                return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                    <div class="countryDiv">
                        <h6>
                            <span><img src="assets/images/Info (1).svg"></span>
                            ${b.name}
                        </h6>
                        <p>${b.secondaryText || ""}</p>
                    </div>
                    <div class="custom-control custom-switch">
                        <input type="checkbox" class="custom-control-input"  id="option-${b.folder}-${i}-${j}" name="option-${b.folder}" value="${b.type}">
                        <label class="custom-control-label" for="option-${b.folder}-${i}-${j}"></label>
                    </div>
                </li>`;
            }).join("\n");
            let groupRadioButton = `
                <div class="form-check form-switch  d-flex justify-content-between align-items-center mx-2">
                    <label class="form-check-label ms-1">${a}</label>
                    <input class="form-check-input" role="switch" type="radio" data-id="risk-group-${a}" name="risk-group" />
                </div>
                <div class="risk-group-child" id="risk-group-${a}" style="display: none;">${riskGroupOptions}</div>
            `;
            return groupRadioButton;
        }).join("\n");
        this.optionsRisk.empty().html(riskOptions);
        $("input[name='option-risk'][type='checkbox']").on("change", e => {
            let layerName = $(e.currentTarget).val();
            let layerDetails = this.vectorIndex.find(b => b.type == layerName);
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
            let otherLayerTypes = this.vectorIndex.filter(b => ["risk", "hazard", "projects"].includes(b.folder) && b.type != layerName);
            otherLayerTypes.forEach(a => this.removeSvgGroupById(a.type));
            $("input[name='option-risk'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-hazard'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-resource-layer'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-projects'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            if (this.currentWmsLayer) {
                this.map.removeLayer(this.currentWmsLayer);
                this.currentWmsLayer = null;
            }
            let allFillPolygonsUnchecked = (
                !$("input[name='option-hazard'][type='checkbox']:checked").length &&
                !$("input[name='option-risk'][type='checkbox']:checked").length &&
                !$("input[name='option-projects'][type='checkbox']:checked").length &&
                !$("input[name='option-resource-layer'][type='checkbox']:checked").length
            );
            if (allFillPolygonsUnchecked) this.mapLegend.empty();
        });
        $("input[type='radio'][name='risk-group']").on("change", e => {
            let currentTarget = $(e.currentTarget);
            let isChecked = currentTarget.prop("checked");
            if (isChecked) {
                $(`div.risk-group-child#${currentTarget.data("id")}`).show();
                $(`div.risk-group-child:not(#${currentTarget.data("id")})`).hide();
            }
        });

        // 7. Resource Layer - Raster
        let resourceLayerDetails = this.resourceLayerIndex;
        let resourceLayerOptions = resourceLayerDetails.map(a => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input"  id="option-resource-layer" name="option-resource-layer" value="${a.type}">
                    <label class="custom-control-label" for="option-resource-layer"></label>
                </div>
            </li>`
        }).join("\n");
        this.optionsResourceLayer.empty().html(resourceLayerOptions);
        $("input[name='option-resource-layer'][type='checkbox']").on("change", e => {
            if (e.currentTarget.checked) {
                // Uncheck all other checkboxes
                $("input[name='option-resource-layer'][type='checkbox']").not(e.currentTarget).prop("checked", false);
                // Get the selected layer details
                let layerName = $(e.currentTarget).val();
                let layerDetails = this.resourceLayerIndex.find(b => b.type == layerName);
                // Remove previously added layer if exists
                if (this.currentWmsLayer) this.map.removeLayer(this.currentWmsLayer);
                let otherLayerTypes = this.vectorIndex.filter(b => ["risk", "hazard", "projects"].includes(b.folder) && b.type != layerName);
                otherLayerTypes.forEach(a => this.removeSvgGroupById(a.type));
                $("input[name='option-projects'][type='checkbox']").not(e.currentTarget).prop("checked", false);
                $("input[name='option-risk'][type='checkbox']").not(e.currentTarget).prop("checked", false);
                $("input[name='option-hazard'][type='checkbox']").not(e.currentTarget).prop("checked", false);
                $("input[name='option-projects'][type='checkbox']").not(e.currentTarget).prop("checked", false);
                // Add the new overlay resource layer to the map
                let wmsLayer = this.overlayRaster(layerDetails);
                wmsLayer.addTo(this.map);
                this.currentWmsLayer = wmsLayer;
            } else {
                // Checkbox was unchecked, remove the corresponding layer
                if (this.currentWmsLayer) {
                    this.map.removeLayer(this.currentWmsLayer);
                    this.currentWmsLayer = null;
                }
            }
            let allFillPolygonsUnchecked = (
                !$("input[name='option-projects'][type='checkbox']:checked").length &&
                !$("input[name='option-hazard'][type='checkbox']:checked").length &&
                !$("input[name='option-risk'][type='checkbox']:checked").length &&
                !$("input[name='option-resource-layer'][type='checkbox']:checked").length
            );
            if (allFillPolygonsUnchecked) this.mapLegend.empty();

            let allProjectPolygonUnchecked = $("input[name='option-projects'][type='checkbox']:checked").length;
            if (!allProjectPolygonUnchecked) this.descProjectList.empty().hide();

            let oneHazardProjectSelected = $("input[name='option-hazard'][type='checkbox']:checked:not([value='multi_hazard'])").length;
            if (oneHazardProjectSelected && layerDetails.refText) {
                this.descCitation.empty().html(`<div class="p-2">${layerDetails.refText}</div>`).show();
            } else this.descCitation.empty().hide();
        });
    }

    readData = (layerDetails) => {
        this.loadMapFile(`${layerDetails.folder}/${layerDetails.file}`)
            .then(topoResponse => {
                let geoData = topojson.feature(topoResponse, topoResponse.objects.collection);
                switch (layerDetails.featureType) {
                    case "Polygon": this.drawPolygons(geoData, layerDetails); break;
                    case "LineString": this.drawLineStrings(geoData, layerDetails); break;
                    case "Point": this.drawPointMarkers(geoData, layerDetails); break;
                    default: break;
                }
            })
            .catch(err => {
                this.pageAlert(`Unable to get ${layerDetails.name} layer`, 0);
                console.error(err);
            })
            .finally(() => this.stopWaiting());
    }

    drawPointMarkers = (geoData, layerDetails) => {
        let markers = L.layerGroup();
        let customIcon = L.icon({
            iconUrl: `assets/images/geospatial-icons/${layerDetails.type}.png`,
            iconSize: [32, 32],
            iconAnchor: [0, 32],
            tooltipAnchor: [16, 16],
        });
        geoData.features.forEach((feature) => {
            let latLng = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
            let marker = L.marker(latLng, { icon: customIcon, maxZoom: 15 });
            marker.addTo(markers);
            marker.on("mouseover", function (e) {
                let d = feature;
                let tooltipValue = d.properties[layerDetails.label2]
                    ? [d.properties[layerDetails.label1], d.properties[layerDetails.label2]].join(" | ")
                    : d.properties[layerDetails.label1];
                let tooltipContent = `${layerDetails.name}: ${tooltipValue}`;
                marker.bindTooltip(tooltipContent, {
                    direction: 'bottom',
                    offset: [0, -16],
                }).openTooltip();
            }).on("mouseout", function (e) {
                marker.unbindTooltip();
            });
        });
        markers.addTo(this.map);
        this.pointMarkerLayers[`point-${layerDetails.type}`] = markers;
    }

    removePointMarkers = (layerId) => {
        let markerLayer = this.pointMarkerLayers[layerId];
        if (markerLayer) {
            delete this.pointMarkerLayers[layerId];
            this.map.removeLayer(markerLayer);
        }
    }

    drawLineStrings = (geoData, layerDetails) => {
        let lineStrings = L.d3SvgOverlay((selection, projection) => {
            let pScale = projection.scale;
            let locationGroup = selection.selectAll("path").data(geoData.features);
            locationGroup.enter()
                .append("path")
                .attr("d", d => projection.pathFromGeojson(d))
                .attr("id", (d, i) => `${layerDetails.type}_${i}`)
                .attr("style", "z-index:4000;pointer-events:visiblePainted !important")
                .attr("fill", layerDetails.fill || "transparent")
                .attr("stroke", layerDetails.stroke)
                .attr("stroke-width", "1px")

            locationGroup.transition().duration(10).attr("stroke-width", `${1 / pScale}px`);
        }, { id: layerDetails.type });
        lineStrings.addTo(this.map);
    }

    drawPolygons = (geoData, layerDetails) => {
        this.descProjectList.empty().hide();
        if (layerDetails.folder == "projects") {
            geoData.features.forEach(feature => {
                feature.properties.project_count
                    = this.mapProjectData.find(b => b.province_id == feature.properties.province_id && b.category == layerDetails.name)?.count || 0;
            });
            this.displayProjectList(null, layerDetails.name, this.country)
        };

        let allProjectPolygonUnchecked = $("input[name='option-projects'][type='checkbox']:checked").length;
        if (!allProjectPolygonUnchecked) this.descProjectList.empty().hide();

        let oneHazardProjectSelected = $("input[name='option-hazard'][type='checkbox']:checked:not([value='multi_hazard'])").length;
        if (oneHazardProjectSelected && layerDetails.refText) {
            this.descCitation.empty().html(`<div class="p-2">${layerDetails.refText}</div>`).show();
        } else this.descCitation.empty().hide();

        let polygonFillIndex = layerDetails.needLegend
            ? layerDetails.variableLegend
                ? this.variableColorRange(
                    this.polygonFillIndex.filter(b => b.folder == layerDetails.folder && b.type == layerDetails.type),
                    geoData.features.map(b => b.properties),
                    layerDetails.label1
                )
                : this.polygonFillIndex.filter(b => b.folder == layerDetails.folder && b.type == layerDetails.type)
            : [];
        polygonFillIndex.length ? this.displayPolygonLegend(polygonFillIndex, layerDetails) : this.mapLegend.empty();

        let tooltip;
        let isTransparent = ["admin", "hydrology"].includes(layerDetails.folder);
        let polygons = L.d3SvgOverlay((selection, projection) => {
            let pScale = projection.scale;
            let locationGroup = selection.selectAll("path").data(geoData.features);
            locationGroup.enter()
                .append("path")
                .attr("d", d => projection.pathFromGeojson(d))
                .attr("id", (d, i) => `${layerDetails.type}_${i}`)
                .attr("style", "z-index:2000;pointer-events:visiblePainted !important;")
                .attr("fill", d => isTransparent
                    ? "transparent"
                    : this.getColorByPolygonValue(d.properties[layerDetails.label1], polygonFillIndex, layerDetails.nonNumericLegend)
                )
                .attr("fill-opacity", isTransparent ? 1 : 0.7)
                .attr("stroke", layerDetails.stroke)
                .attr("stroke-width", "0.5px")
                .on("mouseenter", (e, d, i) => {
                    d3.select(`${layerDetails.type}_${i}`).attr("cursor", "pointer");
                    let mainVal = !isNaN(d.properties[layerDetails.label1])
                        ? this.float2(d.properties[layerDetails.label1])
                        : d.properties[layerDetails.label1]
                    let tooltipValue = d.properties[layerDetails.label2]
                        ? [mainVal, d.properties[layerDetails.label2]].join(" | ")
                        : mainVal;
                    let tooltipContent = `${layerDetails.name}: ${tooltipValue}` || this.country;
                    tooltip = projection.layer.bindTooltip(tooltipContent).openTooltip(
                        L.latLng(projection.layerPointToLatLng(projection.pathFromGeojson.centroid(d)))
                    );
                })
                .on("mouseleave", (e, d, i) => tooltip?.closeTooltip())
                .on("click", (e, d) => {
                    switch (true) {
                        case layerDetails.folder == "projects":
                            if(d.properties.province_id && d.properties.project_count)
                                this.displayProjectList(d.properties.province_id, layerDetails.name, d.properties.ADM1_EN);
                            break;
                        default:
                            break;
                    }
                })
            locationGroup.transition().duration(10).attr("stroke-width", `${0.5 / pScale}px`);
        }, { id: layerDetails.type });
        polygons.addTo(this.map);
    }

    displayProjectList = (province_id, category, province_name) => {
        let requestBody = {
            "province_id": province_id,
            "country_id": this.countryId,
            "category_id": this.lookupData.find(b => b.table == "category").lookup_data.find(b => b.category == category).id
        }
        this.postApi(requestBody, this.authHeader, "projects/province")
            .then(response => {
                let descActionButton = province_id
                    ? `<button class="btn" id="btn-reset-project-list"><i class="fa fa-undo" aria-hidden="true"></i></button>`
                    : ``
                let header = `<div class="d-flex justify-content-between align-items-center flex-wrap mt-1 ps-3 p-3">
                <small><b>${province_name} | ${category} projects</b></small>${descActionButton}
            </div>`;
                if (response.success) {
                    if (response.data.length) {
                        let listHtml = `<div style="height: auto; max-height: 45vh; overflow-y: scroll;">`
                            + response.data.map(a => {
                                let budget = a.funding_amount ? `<b>USD ${strNum(a.funding_amount)}</b>` : "N/A";
                                let start_year = a.start_year ? `<b>${a.start_year}</b>` : "N/A";
                                let end_year = a.end_year ? `<b>${a.end_year}</b>` : "N/A";
                                return `<div class="mb-1 p-3 border-top">
                                <small><b>${a.project_name.replace(/�/g, "")}</b></small>
                                <div class="row mt-1">
                                    <div class="col-sm-6 col-md-6 col-lg-6"><small class="text-muted">Budget<br/>${budget}</small><br/></div>
                                    <div class="col-sm-3 col-md-3 col-lg-3"><small class="text-muted">Start Year<br/>${start_year}</small><br/></div>
                                    <div class="col-sm-3 col-md-3 col-lg-3"><small class="text-muted">End Year<br/>${end_year}</small><br/></div>
                                </div>
                            </div>`;
                            }).join("\n")
                            + `</div>`;
                        this.descProjectList.empty().html(header + listHtml).show();
                    } else {
                        let noticeHtml = `<div class="p-2 text-center"><small>Unavailable</small></div>`;
                        this.descProjectList.empty().html(header + noticeHtml).show();
                    }

                    $("button#btn-reset-project-list").on("click", () => this.displayProjectList(null, category, this.country));
                } else {
                    this.descProjectList.empty().hide()
                }
            })
            .catch(err => {
                this.pageAlert("Issue in getting data for this province", 0);
                console.error(err);
            })
            .finally(this.stopWaiting)
    }


    removeSvgGroupById = (idName) => {
        this.map.eachLayer((l) => {
            if (l.options.id && l.options.id.indexOf(idName) === 0) this.map.removeLayer(l);
        });
    }

    displayPolygonLegend = (polygonFillIndex, layerDetails) => {
        let legendHtml = polygonFillIndex.map(a => {
            let label = layerDetails.showNumRangeInLegend ? `${a.label} (${a.min}-${a.max})` : a.label;
            return `<div style="display: flex; align-items: center;">
                <div style="background-color: ${a.color}; height: 15px; width: 15px;"></div>
                <div style="margin-left: 5px; color: black;">&nbsp;${label}</div>
            </div>`;
        }).join("\n");
        this.mapLegend.empty().html(legendHtml);
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
                label: min != max ? `${this.float1(min)} - ${this.float1(max)}` : `${this.float1(max)}`
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


    getColorByPolygonValue = (value, polygonFillIndex, isNonNumericLegend) => {
        return isNonNumericLegend
            ? polygonFillIndex.find(b => b.discrete == value)?.color || "transparent"
            : polygonFillIndex.find(b => b.min <= value && b.max >= value)?.color || "transparent";
    }


    overlayRaster = (layerDetails) => {
        let baseWMSUrl = `${this.geoserverHost}/geoserver/${layerDetails.workspace}/wms`;
        let wmsLayer = L.tileLayer.betterWms(baseWMSUrl, {
            layers: `${layerDetails.layer}`,
            transparent: true,
            format: 'image/png',
            opacity: 4 / 5
        });
        let baseWMSLegendUrl = `${baseWMSUrl}?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=${layerDetails.workspace}:${layerDetails.layer}`;
        this.mapLegend.empty().html(`<img src="${baseWMSLegendUrl}" />`);
        return wmsLayer;
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
        });
    }

    getApi = (reqHead, path) => {
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

    loadExcelFile = (fileName) => new Promise((resolve, reject) => {
        this.startWaiting();
        fetch(`./assets/vector_maps/srilanka/${fileName}`).then(res => res.blob()).then(file => {
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
        });
    }

    loadMapFile = (mapFile) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "GET",
                "beforeSend": () => this.startWaiting(),
                "url": `./assets/vector_maps/srilanka/${mapFile}`,
                "success": response => typeof (response) == "string" ? resolve(JSON.parse(response)) : resolve(response),
                "error": err => reject(err)
            });
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
    sumArray = (arr) => arr.reduce((a, b) => a + b, 0);
    num = (val) => !isNaN(val) ? parseFloat(val) : 0;
    float1 = (num) => Number.isInteger(num) ? num : num.toFixed(1);
    float2 = (num) => Number.isInteger(num) ? num : num.toFixed(2);

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


class ZambiaGeoSpatial {
    constructor() {
        this.apiUrl = apiUrl;
        this.lookupsReqBody = lookupsReqBody;
        this.countryId = 2;
        this.country = "Zambia";
        this.mapsFolder = "zambia";
        this.centerCoordinates = [-13.1339, 27.8493];
        this.vectorIndex = [];
        this.polygonFillIndex = [];
        this.resourceLayerIndex = [];
        this.mapProjectData = [];
        this.lookupData = [];

        // cookies
        this.cookieObject = getCookies(document.cookie);
        this.jwt = this.cookieObject.jwt;
        this.userEmail = this.cookieObject.userEmail;
        this.isLoggedIn = this.cookieObject.isLoggedIn;
        this.initialCountryId = this.cookieObject.initialCountryId;
        this.authHeader = { "Authorization": this.jwt };
        this.logoutLink = $("a#link-logout");
        this.userMgmtLink = $("li#user-management-link");
        this.loggedInUserEmailLabel = $("li#user-email-label");
        this.userCountryIcon = $("img#user-country-icon");

        // map variables
        this.map = null;
        this.mapContainerId = "map-id";
        this.mapContainer = $("div#map-id");
        this.geoserverHost = "https://csg.iwmi.org";
        this.currentWmsLayer = null;
        this.backgroundTilesLayer = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png";
        this.pointMarkerLayers = {};
        this.mapLegend = $("div#map-legend");
        this.descProjectList = $("div#map-project-list");
        this.descCitation = $("div#map-layer-citation");

        // option holders
        this.optionsAdmin = $("ul#options-admin");
        this.optionsInfrastructure = $("ul#options-infrastructure");
        this.optionsHydrology = $("ul#options-hydrology");
        this.optionsHazard = $("ul#options-hazard");
        this.accordionLabelHazard = $("li#parent-label-hazard");
        this.optionsRisk = $("ul#options-risk");
        this.accordionLabelRisk = $("li#parent-label-risk");
        this.optionsResourceLayer = $("ul#options-resource-layer");
        this.optionsProjects = $("ul#options-projects");
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

    init = () => {
        // this.mapLegend.empty();
        // this.descProjectList.empty();
        // this.descCitation.empty();
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        this.logoutLink.on("click", this.onLogoutClick);
        if (this.isLoggedIn) {
            this.userRoleId != 1
                ? this.userCountryIcon.attr("src", `./assets/flag_icons/2.png`).attr("title", flagIndex[2]).show()
                : this.userCountryIcon.attr("src", null).attr("title", null).hide();
            if (this.map != undefined || this.map != null) {
                this.map.remove();
                this.map.off();
            };
            this.mapContainerElement = L.DomUtil.get(this.mapContainerId);
            if (this.mapContainerElement != null) this.mapContainerElement._leaflet_id = null;
            this.map = L.map(this.mapContainerId, { attributionControl: false, fullscreenControl: true, zoomControl: false });
            L.control.zoom({ position: "topright" }).addTo(this.map);
            this.streetLayer = L.tileLayer(this.backgroundTilesLayer, { maxZoom: 15, opacity: 1 });
            this.streetLayer.addTo(this.map);
            this.map.setView(this.centerCoordinates, 6);
            this.map.touchZoom.disable();
            this.map.doubleClickZoom.disable();
            this.map.scrollWheelZoom.disable();
            this.map.boxZoom.disable();
            this.loadData();
        } else {
            this.userCountryIcon.attr("src", null).attr("title", null).hide();
        }
    }

    loadData = () => {
        Promise.allSettled([
            this.postApi({ "country_id": this.countryId }, this.authHeader, "projects/tracker"),
            this.loadExcelFile("zambia_layer_index.xlsx"),
            this.postApi(this.lookupsReqBody, null, "projects/lookups")
        ])
            .then(responses => {
                responses.forEach((response, i) => {
                    switch (true) {
                        case i == 0: // Projects data
                            if (response.status == "fulfilled") this.mapProjectData = response.value.data.map_data;
                            else this.pageAlert("Issue in getting projects' data from API", 0);
                            break;
                        case i == 1: // Country's layer index
                            if (response.status == "fulfilled") {
                                [this.vectorIndex, this.polygonFillIndex, this.resourceLayerIndex]
                                    = this.excelToArray(response.value, "vectorIndex", "polygonFillIndex", "resourceLayerIndex");
                                this.polygonFillIndex.forEach(a => {
                                    if (a.min !== null && a.max !== null) {
                                        a.min = this.float2(a.min);
                                        a.max = this.float2(a.max);
                                    }
                                })
                            } else this.pageAlert("Issue in loading Sri Lanka's layer index sheet", 0);
                            break;
                        case i == 2: // Project lookup data
                            if (response.status == "fulfilled") this.lookupData = response.value.data;
                            else this.pageAlert("Issue in loading the project lookup data", 0);
                            break;
                        default:
                            break;
                    }
                });
            })
            .then(this.fillLayerOptions)
            .then(() => {
                $(`input[name='option-admin'][type='checkbox'][value='provinces']`).prop("checked", true).trigger("change");
                $(`input[name='option-projects'][type='checkbox'][value='mitigation']`).prop("checked", true).trigger("change");
                // $(`input[name='option-infrastructure'][type='checkbox'][value='towns']`).prop("checked", true).trigger("change");
            })
            .catch(err => {
                console.error(err);
                this.pageAlert("Issue in loading initial data, please contact dev team", 0);
            })
            .finally(this.stopWaiting);
    }

    fillLayerOptions = () => {
        // 1. Admin - Transparent Polygons
        let adminDetails = this.vectorIndex.filter(a => a.folder == "admin" && a.status);
        let adminOptions = adminDetails.map((a,i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input"  id="option-${a.folder}-${i}" name="option-${a.folder}" value="${a.type}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"></label>
                </div>
            </li>`;
        }).join("\n");
        this.optionsAdmin.empty().html(adminOptions);
        $("input[name='option-admin'][type='checkbox']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
        });

        // 2. Projects
        let projectDetails = this.vectorIndex.filter(a => a.folder == "projects" && a.status);
        let projectOptions = projectDetails.map((a,i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input"  id="option-${a.folder}-${i}" name="option-${a.folder}" value="${a.type}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"></label>
                </div>
            </li>`;
        }).join("\n");
        this.optionsProjects.empty().html(projectOptions);
        $("input[name='option-projects'][type='checkbox']").on("change", e => {
            let layerName = $(e.currentTarget).val();
            let layerDetails = this.vectorIndex.find(b => b.type == layerName);
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
            let otherLayerTypes = this.vectorIndex.filter(b => ["risk", "hazard", "projects"].includes(b.folder) && b.type != layerName);
            otherLayerTypes.forEach(a => this.removeSvgGroupById(a.type));
            $("input[name='option-risk'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-hazard'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-resource-layer'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-projects'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            if (this.currentWmsLayer) {
                this.map.removeLayer(this.currentWmsLayer);
                this.currentWmsLayer = null;
            }
            let allFillPolygonsUnchecked = (
                !$("input[name='option-hazard'][type='checkbox']:checked").length &&
                !$("input[name='option-risk'][type='checkbox']:checked").length &&
                !$("input[name='option-projects'][type='checkbox']:checked").length &&
                !$("input[name='option-resource-layer'][type='checkbox']:checked").length
            );
            if (allFillPolygonsUnchecked) this.mapLegend.empty();

            let allProjectPolygonUnchecked = $("input[name='option-projects'][type='checkbox']:checked").length
            if (!allProjectPolygonUnchecked) this.descProjectList.empty().hide();
        });


        // 3. Hydrology
        let hydrologyDetails = this.vectorIndex.filter(a => a.folder == "hydrology" && a.status);
        let hydrologyOptions = hydrologyDetails.map((a,i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                        ${a.featureType == "Point" ? `&nbsp;<img height='16px' width='16px' src='assets/images/geospatial-icons/${a.type}.png'>` : ""}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input"  id="option-${a.folder}-${i}" name="option-${a.folder}" value="${a.type}" data-feature-type="${a.featureType}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"></label>
                </div>
            </li>`;
        }).join("\n");
        this.optionsHydrology.empty().html(hydrologyOptions);
        // Hydrology - Polygon
        $("input[name='option-hydrology'][type='checkbox'][data-feature-type='Polygon']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
        });
        // Hydrology - LineString
        $("input[name='option-hydrology'][type='checkbox'][data-feature-type='LineString']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
        });
        // Hydrology - Point
        $("input[name='option-hydrology'][type='checkbox'][data-feature-type='Point']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removePointMarkers(`point-${layerDetails.type}`);
        });

        // 4. Infrastructure
        let infrastructureDetails = this.vectorIndex.filter(a => a.folder == "infrastructure" && a.status);
        let infrastructureOptions = infrastructureDetails.map((a,i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                        ${a.featureType == "Point" ? `&nbsp;<img height='16px' width='16px' src='assets/images/geospatial-icons/${a.type}.png'>` : ""}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                 <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input"  id="option-${a.folder}-${i}" name="option-${a.folder}" data-feature-type="${a.featureType}" value="${a.type}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"> </label>
                </div>
            </li> `;
        }).join("\n");
        this.optionsInfrastructure.empty().html(infrastructureOptions);
        // Infrastructure - LineString
        $("input[name='option-infrastructure'][type='checkbox'][data-feature-type='LineString']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
        });
        // Infrastructure - Point
        $("input[name='option-infrastructure'][type='checkbox'][data-feature-type='Point']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removePointMarkers(`point-${layerDetails.type}`);
        });

        // 5. Hazard - Filled Polygon
        let hazardDetails = this.vectorIndex.filter(a => a.folder == "hazard" && a.status);
        this.accordionLabelHazard.empty().html(`
            <a class="link_name btn btn_redirect" href="geospatial_compare_view.html?criteria=hazard&country_id=2" target="_blank" 
                 style="color: #fff!important;font-size: 12px!important;padding: 3px 32.5px !important;text-align: center;">
                Comparison View 
                <span><img src="assets/images/arrow_down.svg"></span>
            </a>
        `);
        let hazardOptions = hazardDetails.map((a, i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                 <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input"  id="option-${a.folder}-${i}" name="option-${a.folder}" value="${a.type}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"> </label>
                </div>
            </li>`;
        }).join("\n");
        this.optionsHazard.empty().html(hazardOptions);
        $("input[name='option-hazard'][type='checkbox']").on("change", e => {
            let layerName = $(e.currentTarget).val();
            let layerDetails = this.vectorIndex.find(b => b.type == layerName);
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
            let otherLayerTypes = this.vectorIndex.filter(b => ["risk", "hazard", "projects"].includes(b.folder) && b.type != layerName);
            otherLayerTypes.forEach(a => this.removeSvgGroupById(a.type))
            $("input[name='option-hazard'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-risk'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-projects'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-resource-layer'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            if (this.currentWmsLayer) {
                this.map.removeLayer(this.currentWmsLayer);
                this.currentWmsLayer = null;
            }
            let allFillPolygonsUnchecked = (
                !$("input[name='option-projects'][type='checkbox']:checked").length &&
                !$("input[name='option-hazard'][type='checkbox']:checked").length &&
                !$("input[name='option-risk'][type='checkbox']:checked").length &&
                !$("input[name='option-resource-layer'][type='checkbox']:checked").length
            );
            if (allFillPolygonsUnchecked) this.mapLegend.empty();

            let oneHazardProjectSelected = $("input[name='option-hazard'][type='checkbox']:checked:not([value='multi_hazard'])").length;
            if (oneHazardProjectSelected && layerDetails.refText) {
                this.descCitation.empty().html(`<div class="p-2">${layerDetails.refText}</div>`).show();
            } else this.descCitation.empty().hide();
        });

        // 6. Risk Indicator - Filled Polygon
        let riskDetails = this.vectorIndex.filter(a => a.folder == "risk" && a.status);
        this.accordionLabelRisk.empty().html(`
            <a class="link_name btn btn_redirect" href="geospatial_compare_view.html?criteria=risk&country_id=2" target="_blank" 
                style="color: #fff!important;font-size: 12px!important;padding: 3px 32.5px !important;text-align: center;">
                Comparison View 
                <span><img src="assets/images/arrow_down.svg"></span>
            </a>
        `);
        let riskOptions = riskDetails.map((a, i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input"  id="option-${a.folder}-${i}" name="option-${a.folder}"  value="${a.type}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"> </label>
                </div>
            </li>`;
        }).join("\n");
        this.optionsRisk.empty().html(riskOptions);
        $("input[name='option-risk'][type='checkbox']").on("change", e => {
            let layerName = $(e.currentTarget).val();
            let layerDetails = this.vectorIndex.find(b => b.type == layerName);
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
            let otherLayerTypes = this.vectorIndex.filter(b => ["risk", "hazard", "projects"].includes(b.folder) && b.type != layerName);
            otherLayerTypes.forEach(a => this.removeSvgGroupById(a.type));
            $("input[name='option-risk'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-hazard'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-resource-layer'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-projects'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            if (this.currentWmsLayer) {
                this.map.removeLayer(this.currentWmsLayer);
                this.currentWmsLayer = null;
            }
            let allFillPolygonsUnchecked = (
                !$("input[name='option-hazard'][type='checkbox']:checked").length &&
                !$("input[name='option-risk'][type='checkbox']:checked").length &&
                !$("input[name='option-projects'][type='checkbox']:checked").length &&
                !$("input[name='option-resource-layer'][type='checkbox']:checked").length
            );
            if (allFillPolygonsUnchecked) this.mapLegend.empty();
        });

        // 7. Resource Layer - Raster
        let resourceLayerDetails = this.resourceLayerIndex;
        let resourceLayerOptions = resourceLayerDetails.map((a, i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input"  id="option-${a.folder}-${i}" name="option-resource-layer"  value="${a.type}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"> </label>
                </div>
            </li>`
        }).join("\n");
        this.optionsResourceLayer.empty().html(resourceLayerOptions);
        $("input[name='option-resource-layer'][type='checkbox']").on("change", e => {
            if (e.currentTarget.checked) {
                // Uncheck all other checkboxes
                $("input[name='option-resource-layer'][type='checkbox']").not(e.currentTarget).prop("checked", false);
                // Get the selected layer details
                let layerName = $(e.currentTarget).val();
                let layerDetails = this.resourceLayerIndex.find(b => b.type == layerName);
                // Remove previously added layer if exists
                if (this.currentWmsLayer) this.map.removeLayer(this.currentWmsLayer);
                let otherLayerTypes = this.vectorIndex.filter(b => ["risk", "hazard", "projects"].includes(b.folder) && b.type != layerName);
                otherLayerTypes.forEach(a => this.removeSvgGroupById(a.type));
                $("input[name='option-projects'][type='checkbox']").not(e.currentTarget).prop("checked", false);
                $("input[name='option-risk'][type='checkbox']").not(e.currentTarget).prop("checked", false);
                $("input[name='option-hazard'][type='checkbox']").not(e.currentTarget).prop("checked", false);
                $("input[name='option-projects'][type='checkbox']").not(e.currentTarget).prop("checked", false);
                // Add the new overlay resource layer to the map
                let wmsLayer = this.overlayRaster(layerDetails);
                wmsLayer.addTo(this.map);
                this.currentWmsLayer = wmsLayer;
            } else {
                // Checkbox was unchecked, remove the corresponding layer
                if (this.currentWmsLayer) {
                    this.map.removeLayer(this.currentWmsLayer);
                    this.currentWmsLayer = null;
                }
            }
            let allFillPolygonsUnchecked = (
                !$("input[name='option-projects'][type='checkbox']:checked").length &&
                !$("input[name='option-hazard'][type='checkbox']:checked").length &&
                !$("input[name='option-risk'][type='checkbox']:checked").length &&
                !$("input[name='option-resource-layer'][type='checkbox']:checked").length
            );
            if (allFillPolygonsUnchecked) this.mapLegend.empty();

            let allProjectPolygonUnchecked = $("input[name='option-projects'][type='checkbox']:checked").length;
            if (!allProjectPolygonUnchecked) this.descProjectList.empty().hide();

            let oneHazardProjectSelected = $("input[name='option-hazard'][type='checkbox']:checked:not([value='multi_hazard'])").length;
            if (oneHazardProjectSelected && layerDetails.refText) {
                this.descCitation.empty().html(`<div class="p-2">${layerDetails.refText}</div>`).show();
            } else this.descCitation.empty().hide();
        });
    }

    readData = (layerDetails) => {
        this.loadMapFile(`${layerDetails.folder}/${layerDetails.file}`)
            .then(topoResponse => {
                let geoData = topojson.feature(topoResponse, topoResponse.objects.collection);
                switch (layerDetails.featureType) {
                    case "Polygon": this.drawPolygons(geoData, layerDetails); break;
                    case "LineString": this.drawLineStrings(geoData, layerDetails); break;
                    case "Point": this.drawPointMarkers(geoData, layerDetails); break;
                    default: break;
                }
            })
            .catch(err => {
                this.pageAlert(`Unable to get ${layerDetails.name} layer`, 0);
                console.error(err);
            })
            .finally(() => this.stopWaiting());
    }

    drawPointMarkers = (geoData, layerDetails) => {
        let markers = L.layerGroup();
        let customIcon = L.icon({
            iconUrl: `assets/images/geospatial-icons/${layerDetails.type}.png`,
            iconSize: [32, 32],
            iconAnchor: [0, 32],
            tooltipAnchor: [16, 16],
        });
        geoData.features.forEach((feature) => {
            let latLng = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
            let marker = L.marker(latLng, { icon: customIcon, maxZoom: 15 });
            marker.addTo(markers);
            marker.on("mouseover", function (e) {
                let d = feature;
                let tooltipValue = d.properties[layerDetails.label2]
                    ? [d.properties[layerDetails.label1], d.properties[layerDetails.label2]].join(" | ")
                    : d.properties[layerDetails.label1];
                let tooltipContent = `${layerDetails.name}: ${tooltipValue}`;
                marker.bindTooltip(tooltipContent, {
                    direction: 'bottom',
                    offset: [0, -16],
                }).openTooltip();
            }).on("mouseout", function (e) {
                marker.unbindTooltip();
            });
        });
        markers.addTo(this.map);
        this.pointMarkerLayers[`point-${layerDetails.type}`] = markers;
    }

    removePointMarkers = (layerId) => {
        let markerLayer = this.pointMarkerLayers[layerId];
        if (markerLayer) {
            delete this.pointMarkerLayers[layerId];
            this.map.removeLayer(markerLayer);
        }
    }

    drawLineStrings = (geoData, layerDetails) => {
        let lineStrings = L.d3SvgOverlay((selection, projection) => {
            let pScale = projection.scale;
            let locationGroup = selection.selectAll("path").data(geoData.features);
            locationGroup.enter()
                .append("path")
                .attr("d", d => projection.pathFromGeojson(d))
                .attr("id", (d, i) => `${layerDetails.type}_${i}`)
                .attr("style", "z-index:4000;pointer-events:visiblePainted !important")
                .attr("fill", layerDetails.fill || "transparent")
                .attr("stroke", layerDetails.stroke)
                .attr("stroke-width", "1px")

            locationGroup.transition().duration(10).attr("stroke-width", `${1 / pScale}px`);
        }, { id: layerDetails.type });
        lineStrings.addTo(this.map);
    }

    drawPolygons = (geoData, layerDetails) => {
        this.descProjectList.empty().hide();
        if (layerDetails.folder == "projects") {
            geoData.features.forEach(feature => {
                feature.properties.project_count
                    = this.mapProjectData.find(b => b.province_id == feature.properties.province_id && b.category == layerDetails.name)?.count || 0;
            });
            this.displayProjectList(null, layerDetails.name, this.country)
        };

        let allProjectPolygonUnchecked = $("input[name='option-projects'][type='checkbox']:checked").length;
        if (!allProjectPolygonUnchecked) this.descProjectList.empty().hide();

        let oneHazardProjectSelected = $("input[name='option-hazard'][type='checkbox']:checked:not([value='multi_hazard'])").length;
        if (oneHazardProjectSelected && layerDetails.refText) {
            this.descCitation.empty().html(`<div class="p-2">${layerDetails.refText}</div>`).show();
        } else this.descCitation.empty().hide();

        let polygonFillIndex = layerDetails.needLegend
            ? layerDetails.variableLegend
                ? this.variableColorRange(
                    this.polygonFillIndex.filter(b => b.folder == layerDetails.folder && b.type == layerDetails.type),
                    geoData.features.map(b => b.properties),
                    layerDetails.label1
                )
                : this.polygonFillIndex.filter(b => b.folder == layerDetails.folder && b.type == layerDetails.type)
            : [];
        
        polygonFillIndex.length ? this.displayPolygonLegend(polygonFillIndex, layerDetails) : this.mapLegend.empty();
        let tooltip;
        let isTransparent = ["admin", "hydrology"].includes(layerDetails.folder);
        let polygons = L.d3SvgOverlay((selection, projection) => {
            let pScale = projection.scale;
            let locationGroup = selection.selectAll("path").data(geoData.features);
            locationGroup.enter()
                .append("path")
                .attr("d", d => projection.pathFromGeojson(d))
                .attr("id", (d, i) => `${layerDetails.type}_${i}`)
                .attr("style", "z-index:2000;pointer-events:visiblePainted !important;")
                .attr("fill", d => isTransparent
                    ? "transparent"
                    : this.getColorByPolygonValue(d.properties[layerDetails.label1], polygonFillIndex, layerDetails.nonNumericLegend)
                )
                .attr("fill-opacity", isTransparent ? 1 : 0.7)
                .attr("stroke", layerDetails.stroke)
                .attr("stroke-width", "0.5px")
                .on("mouseenter", (e, d, i) => {
                    d3.select(`${layerDetails.type}_${i}`).attr("cursor", "pointer");
                    let mainVal = !isNaN(d.properties[layerDetails.label1])
                        ? this.float2(d.properties[layerDetails.label1])
                        : d.properties[layerDetails.label1]
                    let tooltipValue = d.properties[layerDetails.label2]
                        ? [mainVal, d.properties[layerDetails.label2]].join(" | ")
                        : mainVal;
                    let tooltipContent = `${layerDetails.name}: ${tooltipValue}` || this.country;
                    tooltip = projection.layer.bindTooltip(tooltipContent).openTooltip(
                        L.latLng(projection.layerPointToLatLng(projection.pathFromGeojson.centroid(d)))
                    );
                })
                .on("mouseleave", (e, d, i) => tooltip?.closeTooltip())
                .on("click", (e, d) => {
                    switch (true) {
                        case layerDetails.folder == "projects":
                            if(d.properties.province_id && d.properties.project_count !== 0)
                                this.displayProjectList(d.properties.province_id, layerDetails.name, d.properties.Province)
                            break;
                        default:
                            break;
                    }
                })
            locationGroup.transition().duration(10).attr("stroke-width", `${0.5 / pScale}px`);
        }, { id: layerDetails.type });
        polygons.addTo(this.map);
    }

    displayProjectList = (province_id, category, province_name) => {
        let requestBody = {
            "province_id": province_id,
            "country_id": this.countryId,
            "category_id": this.lookupData.find(b => b.table == "category").lookup_data.find(b => b.category == category).id
        }
        this.postApi(requestBody, this.authHeader, "projects/province")
            .then(response => {
                let descActionButton = province_id
                    ? `<button class="btn" id="btn-reset-project-list"><i class="fa fa-undo" aria-hidden="true"></i></button>`
                    : ``
                let header = `<div class="d-flex justify-content-between align-items-center flex-wrap mt-1 ps-3 p-3">
                <small><b>${province_name} | ${category} projects</b></small>${descActionButton}
            </div>`;
                if (response.success) {
                    if (response.data.length) {
                        let listHtml = `<div style="height: auto; max-height: 45vh; overflow-y: scroll;">`
                            + response.data.map(a => {
                                let budget = a.funding_amount ? `<b>USD ${strNum(a.funding_amount)}</b>` : "N/A";
                                let start_year = a.start_year ? `<b>${a.start_year}</b>` : "N/A";
                                let end_year = a.end_year ? `<b>${a.end_year}</b>` : "N/A";
                                return `<div class="mb-1 p-3 border-top">
                                <small><b>${a.project_name.replace(/�/g, "")}</b></small>
                                <div class="row mt-1">
                                    <div class="col-sm-6 col-md-6 col-lg-6"><small class="text-muted">Budget<br/>${budget}</small><br/></div>
                                    <div class="col-sm-3 col-md-3 col-lg-3"><small class="text-muted">Start Year<br/>${start_year}</small><br/></div>
                                    <div class="col-sm-3 col-md-3 col-lg-3"><small class="text-muted">End Year<br/>${end_year}</small><br/></div>
                                </div>
                            </div>`;
                            }).join("\n")
                            + `</div>`;
                        this.descProjectList.empty().html(header + listHtml).show();
                    } else {
                        let noticeHtml = `<div class="p-2 text-center"><small>Unavailable</small></div>`;
                        this.descProjectList.empty().html(header + noticeHtml).show();
                    }

                    $("button#btn-reset-project-list").on("click", () => this.displayProjectList(null, category, this.country));
                } else {
                    this.descProjectList.empty().hide()
                }
            })
            .catch(err => {
                this.pageAlert("Issue in getting data for this province", 0);
                console.error(err);
            })
            .finally(this.stopWaiting)
    }


    removeSvgGroupById = (idName) => {
        this.map.eachLayer((l) => {
            if (l.options.id && l.options.id.indexOf(idName) === 0) this.map.removeLayer(l);
        });
    }

    displayPolygonLegend = (polygonFillIndex, layerDetails) => {
        let legendHtml = polygonFillIndex.map(a => {
            let label = layerDetails.showNumRangeInLegend ? `${a.label} (${a.min}-${a.max})` : a.label;
            return `<div style="display: flex; align-items: center;">
                <div style="background-color: ${a.color}; height: 15px; width: 15px;"></div>
                <div style="margin-left: 5px; color: black;">&nbsp;${label}</div>
            </div>`;
        }).join("\n");
        this.mapLegend.empty().html(legendHtml);
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
                label: min != max ? `${this.float1(min)} - ${this.float1(max)}` : `${this.float1(max)}`
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


    getColorByPolygonValue = (value, polygonFillIndex, isNonNumericLegend) => {
        return isNonNumericLegend
            ? polygonFillIndex.find(b => b.discrete == value)?.color || "transparent"
            : polygonFillIndex.find(b => b.min <= value && b.max >= value)?.color || "transparent";
    }


    overlayRaster = (layerDetails) => {
        let baseWMSUrl = `${this.geoserverHost}/geoserver/${layerDetails.workspace}/wms`;
        let wmsLayer = L.tileLayer.betterWms(baseWMSUrl, {
            layers: `${layerDetails.layer}`,
            transparent: true,
            format: 'image/png',
            opacity: 4 / 5
        });
        let baseWMSLegendUrl = `${baseWMSUrl}?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=${layerDetails.workspace}:${layerDetails.layer}`;
        this.mapLegend.empty().html(`<img src="${baseWMSLegendUrl}" />`);
        return wmsLayer;
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
        });
    }

    getApi = (reqHead, path) => {
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

    loadExcelFile = (fileName) => new Promise((resolve, reject) => {
        this.startWaiting();
        fetch(`./assets/vector_maps/zambia/${fileName}`).then(res => res.blob()).then(file => {
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
        });
    }

    loadMapFile = (mapFile) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "GET",
                "beforeSend": () => this.startWaiting(),
                "url": `./assets/vector_maps/zambia/${mapFile}`,
                "success": response => typeof (response) == "string" ? resolve(JSON.parse(response)) : resolve(response),
                "error": err => reject(err)
            });
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
    sumArray = (arr) => arr.reduce((a, b) => a + b, 0);
    num = (val) => !isNaN(val) ? parseFloat(val) : 0;
    float1 = (num) => Number.isInteger(num) ? num : num.toFixed(1);
    float2 = (num) => Number.isInteger(num) ? num : num.toFixed(2);

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

class KenyaGeoSpatial{
    constructor() {
        this.apiUrl = apiUrl;
        this.lookupsReqBody = lookupsReqBody;
        this.countryId = 5;
        this.country = "Kenya";
        this.mapsFolder = "kenya";
        this.centerCoordinates = [-0.0236, 37.9062];
        this.vectorIndex = [];
        this.polygonFillIndex = [];
        this.resourceLayerIndex = [];
        this.mapProjectData = [];
        this.lookupData = [];

        // cookies
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

        // map variables
        this.map = null;
        this.mapContainerId = "map-id";
        this.mapContainer = $("div#map-id");
        this.geoserverHost = "https://csg.iwmi.org";
        this.currentWmsLayer = null;
        this.backgroundTilesLayer = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png";
        this.pointMarkerLayers = {};
        this.mapLegend = $("div#map-legend");
        this.descProjectList = $("div#map-project-list");
        this.descCitation = $("div#map-layer-citation");

        // option holders
        this.optionsAdmin = $("ul#options-admin");
        this.optionsInfrastructure = $("ul#options-infrastructure");
        this.optionsHydrology = $("ul#options-hydrology");
        this.optionsHazard = $("ul#options-hazard");
        this.accordionLabelHazard = $("li#parent-label-hazard");
        this.optionsRisk = $("ul#options-risk");
        this.accordionLabelRisk = $("li#parent-label-risk");
        this.optionsResourceLayer = $("ul#options-resource-layer");
        this.optionsProjects = $("ul#options-projects");
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

    init = () => {
        this.mapLegend.empty();
        this.descProjectList.empty();
        this.descCitation.empty();
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.logoutLink.on("click", this.onLogoutClick);
        if (this.isLoggedIn) {
            this.userRoleId != 1
                ? this.userCountryIcon.attr("src", `./assets/flag_icons/5.png`).attr("title", flagIndex[4]).show()
                : this.userCountryIcon.attr("src", null).attr("title", null).hide();
            if (this.map != undefined || this.map != null) {
                this.map.remove();
                this.map.off();
            };
            this.mapContainerElement = L.DomUtil.get(this.mapContainerId);
            if (this.mapContainerElement != null) this.mapContainerElement._leaflet_id = null;
            this.map = L.map(this.mapContainerId, { attributionControl: false, fullscreenControl: true, zoomControl: false });
            L.control.zoom({ position: "bottomright" }).addTo(this.map);
            this.streetLayer = L.tileLayer(this.backgroundTilesLayer, { maxZoom: 15, opacity: 1 });
            this.streetLayer.addTo(this.map);
            this.map.setView(this.centerCoordinates, 6);
            this.map.touchZoom.disable();
            this.map.doubleClickZoom.disable();
            this.map.scrollWheelZoom.disable();
            this.map.boxZoom.disable();
            this.loadData();
        } else {
            this.userCountryIcon.attr("src", null).attr("title", null).hide();
        }
    }

    loadData = () => {
        Promise.allSettled([
            this.postApi({ "country_id": this.countryId }, this.authHeader, "projects/tracker"),
            this.loadExcelFile("kenya_layer_index.xlsx"),
            this.postApi(this.lookupsReqBody, null, "projects/lookups"),
        ])
        .then(responses => {
            responses.forEach((response, i) => {
                switch (true) {
                    case i == 0: // Projects data
                        if (response.status == "fulfilled") this.mapProjectData = response.value.data.map_data;
                        else this.pageAlert("Issue in getting projects' data from API", 0);
                        break;
                    case i == 1: // Country's layer index
                        if (response.status == "fulfilled") {
                            [this.vectorIndex, this.polygonFillIndex, this.resourceLayerIndex]
                                = this.excelToArray(response.value, "vectorIndex", "polygonFillIndex", "resourceLayerIndex");
                            this.polygonFillIndex.forEach(a => {
                                if (a.min !== null && a.max !== null) {
                                    a.min = this.float2(a.min);
                                    a.max = this.float2(a.max);
                                }
                            })
                        } else this.pageAlert("Issue in loading Kenya's layer index sheet", 0);
                        break;
                    case i == 2: // Project lookup data
                        if (response.status == "fulfilled") this.lookupData = response.value.data;
                        else this.pageAlert("Issue in loading the project lookup data", 0);
                        break;
                    default:
                        break;
                }
            });
        })
        .then(this.fillLayerOptions)
        .then(() => {
            $(`input[name='option-admin'][type='checkbox'][value='counties']`).prop("checked", true).trigger("change");
            $(`input[name='option-projects'][type='checkbox'][value='adaptation']`).prop("checked", true).trigger("change");
        })
        .catch(err => {
            console.error(err);
            this.pageAlert("Issue in loading initial data, please contact dev team", 0);
        })
        .finally(this.stopWaiting);
    }

    fillLayerOptions = () => {
        // 1. Admin - Transparent Polygons
        let adminDetails = this.vectorIndex.filter(a => a.folder == "admin" && a.status);
        let adminOptions = adminDetails.map((a, i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input" id="option-${a.folder}-${i}" name="option-${a.folder}" value="${a.type}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"></label>
                </div>
            </li>`;
        }).join("\n");
        this.optionsAdmin.empty().html(adminOptions);
        $("input[name='option-admin'][type='checkbox']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
        });

        // 2. Projects
        let projectDetails = this.vectorIndex.filter(a => a.folder == "projects" && a.status);
        let projectOptions = projectDetails.map((a,i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input"  id="option-${a.folder}-${i}" name="option-${a.folder}" value="${a.type}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"></label>
                </div>
            </li>`;
        }).join("\n");
        this.optionsProjects.empty().html(projectOptions);
        $("input[name='option-projects'][type='checkbox']").on("change", e => {
            let layerName = $(e.currentTarget).val();
            let layerDetails = this.vectorIndex.find(b => b.type == layerName);
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
            let otherLayerTypes = this.vectorIndex.filter(b => ["risk", "hazard", "projects"].includes(b.folder) && b.type != layerName);
            otherLayerTypes.forEach(a => this.removeSvgGroupById(a.type));
            $("input[name='option-risk'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-hazard'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-resource-layer'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-projects'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            if (this.currentWmsLayer) {
                this.map.removeLayer(this.currentWmsLayer);
                this.currentWmsLayer = null;
            }
            let allFillPolygonsUnchecked = (
                !$("input[name='option-hazard'][type='checkbox']:checked").length &&
                !$("input[name='option-risk'][type='checkbox']:checked").length &&
                !$("input[name='option-projects'][type='checkbox']:checked").length &&
                !$("input[name='option-resource-layer'][type='checkbox']:checked").length
            );
            if (allFillPolygonsUnchecked) this.mapLegend.empty();

            let allProjectPolygonUnchecked = $("input[name='option-projects'][type='checkbox']:checked").length
            if (!allProjectPolygonUnchecked) this.descProjectList.empty().hide();
        });

        // 3. Hydrology
        let hydrologyDetails = this.vectorIndex.filter(a => a.folder == "hydrology" && a.status);
        let hydrologyOptions = hydrologyDetails.map((a,i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                        ${a.featureType == "Point" ? `&nbsp;<img height='16px' width='16px' src='assets/images/geospatial-icons/${a.type}.png'>` : ""}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input"  id="option-${a.folder}-${i}" name="option-${a.folder}" value="${a.type}" data-feature-type="${a.featureType}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"></label>
                </div>
            </li>`;
        }).join("\n");
        this.optionsHydrology.empty().html(hydrologyOptions);
        // Hydrology - Polygon
        $("input[name='option-hydrology'][type='checkbox'][data-feature-type='Polygon']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
        });
        // Hydrology - LineString
        $("input[name='option-hydrology'][type='checkbox'][data-feature-type='LineString']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
        });
        // Hydrology - Point
        $("input[name='option-hydrology'][type='checkbox'][data-feature-type='Point']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removePointMarkers(`point-${layerDetails.type}`);
        });

        // 4. Infrastructure
        let infrastructureDetails = this.vectorIndex.filter(a => a.folder == "infrastructure" && a.status);
        let infrastructureOptions = infrastructureDetails.map((a,i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                        ${a.featureType == "Point" ? `&nbsp;<img height='16px' width='16px' src='assets/images/geospatial-icons/${a.type}.png'>` : ""}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                 <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input"  id="option-${a.folder}-${i}" name="option-${a.folder}" data-feature-type="${a.featureType}" value="${a.type}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"> </label>
                </div>
            </li> `;
        }).join("\n");
        this.optionsInfrastructure.empty().html(infrastructureOptions);
        // Infrastructure - LineString
        $("input[name='option-infrastructure'][type='checkbox'][data-feature-type='LineString']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
        });
        // Infrastructure - Point
        $("input[name='option-infrastructure'][type='checkbox'][data-feature-type='Point']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removePointMarkers(`point-${layerDetails.type}`);
        });

        // 5. Hazard - Filled Polygon
        let hazardDetails = this.vectorIndex.filter(a => a.folder == "hazard" && a.status);
        this.accordionLabelHazard.empty().html(`
            <a class="link_name btn btn_redirect" href="geospatial_compare_view.html?criteria=hazard&country_id=5" target="_blank" 
                 style="color: #fff!important;font-size: 12px!important;padding: 3px 32.5px !important;text-align: center;">
                Comparison View 
                <span><img src="assets/images/arrow_down.svg"></span>
            </a>
        `);
        let hazardOptions = hazardDetails.map((a, i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                 <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input"  id="option-${a.folder}-${i}" name="option-${a.folder}" value="${a.type}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"> </label>
                </div>
            </li>`;
        }).join("\n");
        this.optionsHazard.empty().html(hazardOptions);
        $("input[name='option-hazard'][type='checkbox']").on("change", e => {
            let layerName = $(e.currentTarget).val();
            let layerDetails = this.vectorIndex.find(b => b.type == layerName);
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
            let otherLayerTypes = this.vectorIndex.filter(b => ["risk", "hazard", "projects"].includes(b.folder) && b.type != layerName);
            otherLayerTypes.forEach(a => this.removeSvgGroupById(a.type))
            $("input[name='option-hazard'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-risk'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-projects'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-resource-layer'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            if (this.currentWmsLayer) {
                this.map.removeLayer(this.currentWmsLayer);
                this.currentWmsLayer = null;
            }
            let allFillPolygonsUnchecked = (
                !$("input[name='option-projects'][type='checkbox']:checked").length &&
                !$("input[name='option-hazard'][type='checkbox']:checked").length &&
                !$("input[name='option-risk'][type='checkbox']:checked").length &&
                !$("input[name='option-resource-layer'][type='checkbox']:checked").length
            );
            if (allFillPolygonsUnchecked) this.mapLegend.empty();

            let oneHazardProjectSelected = $("input[name='option-hazard'][type='checkbox']:checked:not([value='multi_hazard'])").length;
            if (oneHazardProjectSelected && layerDetails.refText) {
                this.descCitation.empty().html(`<div class="p-2">${layerDetails.refText}</div>`).show();
            } else this.descCitation.empty().hide();
        });

        // 6. Risk Indicator - Filled Polygon
        this.accordionLabelRisk.empty();
        this.optionsRisk.empty().html(`<span class="text-dark">COMING SOON</span>`);

        // 7. Resource Layer - Raster
        let resourceLayerDetails = this.resourceLayerIndex;
        let resourceLayerOptions = resourceLayerDetails.map((a, i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input"  id="option-${a.folder}-${i}" name="option-resource-layer"  value="${a.type}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"> </label>
                </div>
            </li>`
        }).join("\n");
        this.optionsResourceLayer.empty().html(resourceLayerOptions);
        $("input[name='option-resource-layer'][type='checkbox']").on("change", e => {
            if (e.currentTarget.checked) {
                // Uncheck all other checkboxes
                $("input[name='option-resource-layer'][type='checkbox']").not(e.currentTarget).prop("checked", false);
                // Get the selected layer details
                let layerName = $(e.currentTarget).val();
                let layerDetails = this.resourceLayerIndex.find(b => b.type == layerName);
                // Remove previously added layer if exists
                if (this.currentWmsLayer) this.map.removeLayer(this.currentWmsLayer);
                let otherLayerTypes = this.vectorIndex.filter(b => ["risk", "hazard", "projects"].includes(b.folder) && b.type != layerName);
                otherLayerTypes.forEach(a => this.removeSvgGroupById(a.type));
                $("input[name='option-projects'][type='checkbox']").not(e.currentTarget).prop("checked", false);
                $("input[name='option-risk'][type='checkbox']").not(e.currentTarget).prop("checked", false);
                $("input[name='option-hazard'][type='checkbox']").not(e.currentTarget).prop("checked", false);
                $("input[name='option-projects'][type='checkbox']").not(e.currentTarget).prop("checked", false);
                // Add the new overlay resource layer to the map
                let wmsLayer = this.overlayRaster(layerDetails);
                wmsLayer.addTo(this.map);
                this.currentWmsLayer = wmsLayer;
            } else {
                // Checkbox was unchecked, remove the corresponding layer
                if (this.currentWmsLayer) {
                    this.map.removeLayer(this.currentWmsLayer);
                    this.currentWmsLayer = null;
                }
            }
            let allFillPolygonsUnchecked = (
                !$("input[name='option-projects'][type='checkbox']:checked").length &&
                !$("input[name='option-hazard'][type='checkbox']:checked").length &&
                !$("input[name='option-risk'][type='checkbox']:checked").length &&
                !$("input[name='option-resource-layer'][type='checkbox']:checked").length
            );
            if (allFillPolygonsUnchecked) this.mapLegend.empty();

            let allProjectPolygonUnchecked = $("input[name='option-projects'][type='checkbox']:checked").length;
            if (!allProjectPolygonUnchecked) this.descProjectList.empty().hide();

            let oneHazardProjectSelected = $("input[name='option-hazard'][type='checkbox']:checked:not([value='multi_hazard'])").length;
            if (oneHazardProjectSelected && layerDetails.refText) {
                this.descCitation.empty().html(`<div class="p-2">${layerDetails.refText}</div>`).show();
            } else this.descCitation.empty().hide();
        });
    }


    readData = (layerDetails) => {
        this.loadMapFile(`${layerDetails.folder}/${layerDetails.file}`)
        .then(topoResponse => {
            let geoData = topojson.feature(topoResponse, topoResponse.objects.collection);
            switch (layerDetails.featureType) {
                case "Polygon": this.drawPolygons(geoData, layerDetails); break;
                case "LineString": this.drawLineStrings(geoData, layerDetails); break;
                case "Point": this.drawPointMarkers(geoData, layerDetails); break;
                default: break;
            }
        })
        .catch(err => {
            this.pageAlert(`Unable to get ${layerDetails.name} layer`, 0);
            console.error(err);
        })
        .finally(() => this.stopWaiting());
    }

    drawPointMarkers = (geoData, layerDetails) => {
        let markers = L.layerGroup();
        let customIcon = L.icon({
            iconUrl: `assets/images/geospatial-icons/${layerDetails.type}.png`,
            iconSize: [32, 32],
            iconAnchor: [0, 32],
            tooltipAnchor: [16, 16],
        });
        geoData.features.forEach((feature) => {
            let latLng = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
            let marker = L.marker(latLng, { icon: customIcon, maxZoom: 15 });
            marker.addTo(markers);
            marker.on("mouseover", function (e) {
                let d = feature;
                let tooltipValue = d.properties[layerDetails.label2]
                    ? [d.properties[layerDetails.label1], d.properties[layerDetails.label2]].join(" | ")
                    : d.properties[layerDetails.label1];
                let tooltipContent = `${layerDetails.name}: ${tooltipValue}`;
                marker.bindTooltip(tooltipContent, {
                    direction: 'bottom',
                    offset: [0, -16],
                }).openTooltip();
            }).on("mouseout", function (e) {
                marker.unbindTooltip();
            });
        });
        markers.addTo(this.map);
        this.pointMarkerLayers[`point-${layerDetails.type}`] = markers;
    }

    removePointMarkers = (layerId) => {
        let markerLayer = this.pointMarkerLayers[layerId];
        if (markerLayer) {
            delete this.pointMarkerLayers[layerId];
            this.map.removeLayer(markerLayer);
        }
    }

    drawLineStrings = (geoData, layerDetails) => {
        let lineStrings = L.d3SvgOverlay((selection, projection) => {
            let pScale = projection.scale;
            let locationGroup = selection.selectAll("path").data(geoData.features);
            locationGroup.enter()
                .append("path")
                .attr("d", d => projection.pathFromGeojson(d))
                .attr("id", (d, i) => `${layerDetails.type}_${i}`)
                .attr("style", "z-index:4000;pointer-events:visiblePainted !important")
                .attr("fill", layerDetails.fill || "transparent")
                .attr("stroke", layerDetails.stroke)
                .attr("stroke-width", "1px")

            locationGroup.transition().duration(10).attr("stroke-width", `${1 / pScale}px`);
        }, { id: layerDetails.type });
        lineStrings.addTo(this.map);
    }


    drawPolygons = (geoData, layerDetails) => {
        this.descProjectList.empty().hide();
        if (layerDetails.folder == "projects") {
            geoData.features.forEach(feature => {
                feature.properties.project_count
                    = this.mapProjectData.find(b => b.province_id == feature.properties.province_id && b.category == layerDetails.name)?.count || 0;
            });
            this.displayProjectList(null, layerDetails.name, this.country)
        };

        let allProjectPolygonUnchecked = $("input[name='option-projects'][type='checkbox']:checked").length;
        if (!allProjectPolygonUnchecked) this.descProjectList.empty().hide();

        let oneHazardProjectSelected = $("input[name='option-hazard'][type='checkbox']:checked:not([value='multi_hazard'])").length;
        if (oneHazardProjectSelected && layerDetails.refText) {
            this.descCitation.empty().html(`<div class="p-2">${layerDetails.refText}</div>`).show();
        } else this.descCitation.empty().hide();

        let polygonFillIndex = layerDetails.needLegend
            ? layerDetails.variableLegend
                ? this.variableColorRange(
                    this.polygonFillIndex.filter(b => b.folder == layerDetails.folder && b.type == layerDetails.type),
                    geoData.features.map(b => b.properties),
                    layerDetails.label1
                )
                : this.polygonFillIndex.filter(b => b.folder == layerDetails.folder && b.type == layerDetails.type)
            : [];
        polygonFillIndex.length ? this.displayPolygonLegend(polygonFillIndex, layerDetails) : this.mapLegend.empty();

        let tooltip;
        let isTransparent = ["admin", "hydrology"].includes(layerDetails.folder);
        let polygons = L.d3SvgOverlay((selection, projection) => {
            let pScale = projection.scale;
            let locationGroup = selection.selectAll("path").data(geoData.features);
            locationGroup.enter()
                .append("path")
                .attr("d", d => projection.pathFromGeojson(d))
                .attr("id", (d, i) => `${layerDetails.type}_${i}`)
                .attr("style", "z-index:2000;pointer-events:visiblePainted !important;")
                .attr("fill", d => isTransparent
                    ? "transparent"
                    : this.getColorByPolygonValue(d.properties[layerDetails.label1], polygonFillIndex, layerDetails.nonNumericLegend)
                )
                .attr("fill-opacity", isTransparent ? 1 : 0.7)
                .attr("stroke", layerDetails.stroke)
                .attr("stroke-width", "0.5px")
                .on("mouseenter", (e, d, i) => {
                    d3.select(`${layerDetails.type}_${i}`).attr("cursor", "pointer");
                    let mainVal = !isNaN(d.properties[layerDetails.label1])
                        ? this.float2(d.properties[layerDetails.label1])
                        : d.properties[layerDetails.label1]
                    let tooltipValue = d.properties[layerDetails.label2]
                        ? [mainVal, d.properties[layerDetails.label2]].join(" | ")
                        : mainVal;
                    let tooltipContent = `${layerDetails.name}: ${tooltipValue}` || this.country;
                    tooltip = projection.layer.bindTooltip(tooltipContent).openTooltip(
                        L.latLng(projection.layerPointToLatLng(projection.pathFromGeojson.centroid(d)))
                    );
                })
                .on("mouseleave", (e, d, i) => tooltip?.closeTooltip())
                .on("click", (e, d) => {
                    switch (true) {
                        case layerDetails.folder == "projects":
                            if(d.properties.province_id && d.properties.project_count !== 0)
                                this.displayProjectList(d.properties.province_id, layerDetails.name, d.properties.ADM1_EN);
                            break;
                        default:
                            break;
                    }
                })
            locationGroup.transition().duration(10).attr("stroke-width", `${0.5 / pScale}px`);
        }, { id: layerDetails.type });
        polygons.addTo(this.map);
    }

    displayProjectList = (province_id, category, province_name) => {
        let requestBody = {
            "province_id": province_id,
            "country_id": this.countryId,
            "category_id": this.lookupData.find(b => b.table == "category").lookup_data.find(b => b.category == category).id
        }
        this.postApi(requestBody, this.authHeader, "projects/province")
        .then(response => {
            let descActionButton = province_id
                ? `<button class="btn" id="btn-reset-project-list"><i class="fa fa-undo" aria-hidden="true"></i></button>`
                : ``
            let header = `<div class="d-flex justify-content-between align-items-center flex-wrap mt-1 ps-3 p-3">
            <small><b>${province_name} | ${category} projects</b></small>${descActionButton}
        </div>`;
            if (response.success) {
                if (response.data.length) {
                    let listHtml = `<div style="height: auto; max-height: 45vh; overflow-y: scroll;">`
                        + response.data.map(a => {
                            let budget = a.funding_amount ? `<b>USD ${strNum(a.funding_amount)}</b>` : "N/A";
                            let start_year = a.start_year ? `<b>${a.start_year}</b>` : "N/A";
                            let end_year = a.end_year ? `<b>${a.end_year}</b>` : "N/A";
                            return `<div class="mb-1 p-3 border-top">
                            <small><b>${a.project_name.replace(/�/g, "")}</b></small>
                            <div class="row mt-1">
                                <div class="col-sm-6 col-md-6 col-lg-6"><small class="text-muted">Budget<br/>${budget}</small><br/></div>
                                <div class="col-sm-3 col-md-3 col-lg-3"><small class="text-muted">Start Year<br/>${start_year}</small><br/></div>
                                <div class="col-sm-3 col-md-3 col-lg-3"><small class="text-muted">End Year<br/>${end_year}</small><br/></div>
                            </div>
                        </div>`;
                        }).join("\n")
                        + `</div>`;
                    this.descProjectList.empty().html(header + listHtml).show();
                } else {
                    let noticeHtml = `<div class="p-2 text-center"><small>Unavailable</small></div>`;
                    this.descProjectList.empty().html(header + noticeHtml).show();
                }

                $("button#btn-reset-project-list").on("click", () => this.displayProjectList(null, category, this.country));
            } else {
                this.descProjectList.empty().hide()
            }
        })
        .catch(err => {
            this.pageAlert("Issue in getting data for this province", 0);
            console.error(err);
        })
        .finally(this.stopWaiting)
    }


    removeSvgGroupById = (idName) => {
        this.map.eachLayer((l) => {
            if (l.options.id && l.options.id.indexOf(idName) === 0) this.map.removeLayer(l);
        });
    }

    displayPolygonLegend = (polygonFillIndex, layerDetails) => {
        let legendHtml = polygonFillIndex.map(a => {
            let label = layerDetails.showNumRangeInLegend ? `${a.label} (${a.min}-${a.max})` : a.label;
            return `<div style="display: flex; align-items: center;">
                <div style="background-color: ${a.color}; height: 15px; width: 15px;"></div>
                <div style="margin-left: 5px; color: black;">&nbsp;${label}</div>
            </div>`;
        }).join("\n");
        this.mapLegend.empty().html(legendHtml);
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
                label: min != max ? `${this.float1(min)} - ${this.float1(max)}` : `${this.float1(max)}`
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


    getColorByPolygonValue = (value, polygonFillIndex, isNonNumericLegend) => {
        return isNonNumericLegend
            ? polygonFillIndex.find(b => b.discrete == value)?.color || "transparent"
            : polygonFillIndex.find(b => b.min <= value && b.max >= value)?.color || "transparent";
    }


    overlayRaster = (layerDetails) => {
        let baseWMSUrl = `${this.geoserverHost}/geoserver/${layerDetails.workspace}/wms`;
        let wmsLayer = L.tileLayer.betterWms(baseWMSUrl, {
            layers: `${layerDetails.layer}`,
            transparent: true,
            format: 'image/png',
            opacity: 4 / 5
        });
        let baseWMSLegendUrl = `${baseWMSUrl}?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=${layerDetails.workspace}:${layerDetails.layer}`;
        this.mapLegend.empty().html(`<img src="${baseWMSLegendUrl}" />`);
        return wmsLayer;
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
        });
    }

    getApi = (reqHead, path) => {
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

    loadExcelFile = (fileName) => new Promise((resolve, reject) => {
        this.startWaiting();
        fetch(`./assets/vector_maps/kenya/${fileName}`).then(res => res.blob()).then(file => {
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
        });
    }

    loadMapFile = (mapFile) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "GET",
                "beforeSend": () => this.startWaiting(),
                "url": `./assets/vector_maps/kenya/${mapFile}`,
                "success": response => typeof (response) == "string" ? resolve(JSON.parse(response)) : resolve(response),
                "error": err => reject(err)
            });
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
    sumArray = (arr) => arr.reduce((a, b) => a + b, 0);
    num = (val) => !isNaN(val) ? parseFloat(val) : 0;
    float1 = (num) => Number.isInteger(num) ? num : num.toFixed(1);
    float2 = (num) => Number.isInteger(num) ? num : num.toFixed(2);

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

class SenegalGeoSpatial{
    constructor() {
        this.apiUrl = apiUrl;
        this.lookupsReqBody = lookupsReqBody;
        this.countryId = 7;
        this.country = "Senegal";
        this.mapsFolder = "senegal";
        this.centerCoordinates = [14.4974, -14.4524];
        this.vectorIndex = [];
        this.polygonFillIndex = [];
        this.resourceLayerIndex = [];
        this.mapProjectData = [];
        this.lookupData = [];

        // cookies
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

        // map variables
        this.map = null;
        this.mapContainerId = "map-id";
        this.mapContainer = $("div#map-id");
        this.geoserverHost = "https://csg.iwmi.org";
        this.currentWmsLayer = null;
        this.backgroundTilesLayer = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png";
        this.pointMarkerLayers = {};
        this.mapLegend = $("div#map-legend");
        this.descProjectList = $("div#map-project-list");
        this.descCitation = $("div#map-layer-citation");

        // option holders
        this.optionsAdmin = $("ul#options-admin");
        this.optionsInfrastructure = $("ul#options-infrastructure");
        this.optionsHydrology = $("ul#options-hydrology");
        this.optionsHazard = $("ul#options-hazard");
        this.accordionLabelHazard = $("li#parent-label-hazard");
        this.optionsRisk = $("ul#options-risk");
        this.accordionLabelRisk = $("li#parent-label-risk");
        this.optionsResourceLayer = $("ul#options-resource-layer");
        this.optionsProjects = $("ul#options-projects");
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

    init = () => {
        this.mapLegend.empty();
        this.descProjectList.empty();
        this.descCitation.empty();
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.logoutLink.on("click", this.onLogoutClick);
        if (this.isLoggedIn) {
            this.userRoleId != 1
                ? this.userCountryIcon.attr("src", `./assets/flag_icons/5.png`).attr("title", flagIndex[4]).show()
                : this.userCountryIcon.attr("src", null).attr("title", null).hide();
            if (this.map != undefined || this.map != null) {
                this.map.remove();
                this.map.off();
            };
            this.mapContainerElement = L.DomUtil.get(this.mapContainerId);
            if (this.mapContainerElement != null) this.mapContainerElement._leaflet_id = null;
            this.map = L.map(this.mapContainerId, { attributionControl: false, fullscreenControl: true, zoomControl: false });
            L.control.zoom({ position: "bottomright" }).addTo(this.map);
            this.streetLayer = L.tileLayer(this.backgroundTilesLayer, { maxZoom: 15, opacity: 1 });
            this.streetLayer.addTo(this.map);
            this.map.setView(this.centerCoordinates, 6.5);
            this.map.touchZoom.disable();
            this.map.doubleClickZoom.disable();
            this.map.scrollWheelZoom.disable();
            this.map.boxZoom.disable();
            this.loadData();
        } else {
            this.userCountryIcon.attr("src", null).attr("title", null).hide();
        }
    }

    loadData = () => {
        Promise.allSettled([
            this.postApi({ "country_id": this.countryId }, this.authHeader, "projects/tracker"),
            this.loadExcelFile("senegal_layer_index.xlsx"),
            this.postApi(this.lookupsReqBody, null, "projects/lookups"),
        ])
        .then(responses => {
            responses.forEach((response, i) => {
                switch (true) {
                    case i == 0: // Projects data
                        if (response.status == "fulfilled") this.mapProjectData = response.value.data.map_data;
                        else this.pageAlert("Issue in getting projects' data from API", 0);
                        break;
                    case i == 1: // Country's layer index
                        if (response.status == "fulfilled") {
                            [this.vectorIndex, this.polygonFillIndex, this.resourceLayerIndex]
                                = this.excelToArray(response.value, "vectorIndex", "polygonFillIndex", "resourceLayerIndex");
                            this.polygonFillIndex.forEach(a => {
                                if (a.min !== null && a.max !== null) {
                                    a.min = this.float2(a.min);
                                    a.max = this.float2(a.max);
                                }
                            })
                        } else this.pageAlert("Issue in loading Kenya's layer index sheet", 0);
                        break;
                    case i == 2: // Project lookup data
                        if (response.status == "fulfilled") this.lookupData = response.value.data;
                        else this.pageAlert("Issue in loading the project lookup data", 0);
                        break;
                    default:
                        break;
                }
            });
        })
        .then(this.fillLayerOptions)
        .then(() => {
            $(`input[name='option-admin'][type='checkbox'][value='regions']`).prop("checked", true).trigger("change");
            $(`input[name='option-projects'][type='checkbox'][value='adaptation']`).prop("checked", true).trigger("change");
        })
        .catch(err => {
            console.error(err);
            this.pageAlert("Issue in loading initial data, please contact dev team", 0);
        })
        .finally(this.stopWaiting);
    }

    fillLayerOptions = () => {
        // 1. Admin - Transparent Polygons
        let adminDetails = this.vectorIndex.filter(a => a.folder == "admin" && a.status);
        let adminOptions = adminDetails.map((a, i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input" id="option-${a.folder}-${i}" name="option-${a.folder}" value="${a.type}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"></label>
                </div>
            </li>`;
        }).join("\n");
        this.optionsAdmin.empty().html(adminOptions);
        $("input[name='option-admin'][type='checkbox']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
        });

        // 2. Projects
        let projectDetails = this.vectorIndex.filter(a => a.folder == "projects" && a.status);
        let projectOptions = projectDetails.map((a,i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input"  id="option-${a.folder}-${i}" name="option-${a.folder}" value="${a.type}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"></label>
                </div>
            </li>`;
        }).join("\n");
        this.optionsProjects.empty().html(projectOptions);
        $("input[name='option-projects'][type='checkbox']").on("change", e => {
            let layerName = $(e.currentTarget).val();
            let layerDetails = this.vectorIndex.find(b => b.type == layerName);
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
            let otherLayerTypes = this.vectorIndex.filter(b => ["risk", "hazard", "projects"].includes(b.folder) && b.type != layerName);
            otherLayerTypes.forEach(a => this.removeSvgGroupById(a.type));
            $("input[name='option-risk'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-hazard'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-resource-layer'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-projects'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            if (this.currentWmsLayer) {
                this.map.removeLayer(this.currentWmsLayer);
                this.currentWmsLayer = null;
            }
            let allFillPolygonsUnchecked = (
                !$("input[name='option-hazard'][type='checkbox']:checked").length &&
                !$("input[name='option-risk'][type='checkbox']:checked").length &&
                !$("input[name='option-projects'][type='checkbox']:checked").length &&
                !$("input[name='option-resource-layer'][type='checkbox']:checked").length
            );
            if (allFillPolygonsUnchecked) this.mapLegend.empty();

            let allProjectPolygonUnchecked = $("input[name='option-projects'][type='checkbox']:checked").length
            if (!allProjectPolygonUnchecked) this.descProjectList.empty().hide();
        });

        // 3. Hydrology
        let hydrologyDetails = this.vectorIndex.filter(a => a.folder == "hydrology" && a.status);
        let hydrologyOptions = hydrologyDetails.map((a,i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                        ${a.featureType == "Point" ? `&nbsp;<img height='16px' width='16px' src='assets/images/geospatial-icons/${a.type}.png'>` : ""}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input"  id="option-${a.folder}-${i}" name="option-${a.folder}" value="${a.type}" data-feature-type="${a.featureType}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"></label>
                </div>
            </li>`;
        }).join("\n");
        this.optionsHydrology.empty().html(hydrologyOptions);
        // Hydrology - Polygon
        $("input[name='option-hydrology'][type='checkbox'][data-feature-type='Polygon']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
        });
        // Hydrology - LineString
        $("input[name='option-hydrology'][type='checkbox'][data-feature-type='LineString']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
        });
        // Hydrology - Point
        $("input[name='option-hydrology'][type='checkbox'][data-feature-type='Point']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removePointMarkers(`point-${layerDetails.type}`);
        });

        // 4. Infrastructure
        let infrastructureDetails = this.vectorIndex.filter(a => a.folder == "infrastructure" && a.status);
        let infrastructureOptions = infrastructureDetails.map((a,i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                        ${a.featureType == "Point" ? `&nbsp;<img height='16px' width='16px' src='assets/images/geospatial-icons/${a.type}.png'>` : ""}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                 <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input"  id="option-${a.folder}-${i}" name="option-${a.folder}" data-feature-type="${a.featureType}" value="${a.type}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"> </label>
                </div>
            </li> `;
        }).join("\n");
        this.optionsInfrastructure.empty().html(infrastructureOptions);
        // Infrastructure - LineString
        $("input[name='option-infrastructure'][type='checkbox'][data-feature-type='LineString']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
        });
        // Infrastructure - Point
        $("input[name='option-infrastructure'][type='checkbox'][data-feature-type='Point']").on("change", e => {
            let layerDetails = this.vectorIndex.find(b => b.type == $(e.currentTarget).val());
            e.currentTarget.checked ? this.readData(layerDetails) : this.removePointMarkers(`point-${layerDetails.type}`);
        });

        // 5. Hazard - Filled Polygon
        let hazardDetails = this.vectorIndex.filter(a => a.folder == "hazard" && a.status);
        this.accordionLabelHazard.empty().html(`
            <a class="link_name btn btn_redirect" href="geospatial_compare_view.html?criteria=hazard&country_id=7" target="_blank" 
                 style="color: #fff!important;font-size: 12px!important;padding: 3px 32.5px !important;text-align: center;">
                Comparison View 
                <span><img src="assets/images/arrow_down.svg"></span>
            </a>
        `);
        let hazardOptions = hazardDetails.map((a, i) => {
            return `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 py-1">
                <div class="countryDiv">
                    <h6>
                        <span><img src="assets/images/Info (1).svg"></span>
                        ${a.name}
                    </h6>
                    <!--p>${a.secondaryText || ""}</p-->
                </div>
                 <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input"  id="option-${a.folder}-${i}" name="option-${a.folder}" value="${a.type}">
                    <label class="custom-control-label" for="option-${a.folder}-${i}"> </label>
                </div>
            </li>`;
        }).join("\n");
        this.optionsHazard.empty().html(hazardOptions);
        $("input[name='option-hazard'][type='checkbox']").on("change", e => {
            let layerName = $(e.currentTarget).val();
            let layerDetails = this.vectorIndex.find(b => b.type == layerName);
            e.currentTarget.checked ? this.readData(layerDetails) : this.removeSvgGroupById(layerDetails.type);
            let otherLayerTypes = this.vectorIndex.filter(b => ["risk", "hazard", "projects"].includes(b.folder) && b.type != layerName);
            otherLayerTypes.forEach(a => this.removeSvgGroupById(a.type))
            $("input[name='option-hazard'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-risk'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-projects'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            $("input[name='option-resource-layer'][type='checkbox']").not(e.currentTarget).prop("checked", false);
            if (this.currentWmsLayer) {
                this.map.removeLayer(this.currentWmsLayer);
                this.currentWmsLayer = null;
            }
            let allFillPolygonsUnchecked = (
                !$("input[name='option-projects'][type='checkbox']:checked").length &&
                !$("input[name='option-hazard'][type='checkbox']:checked").length &&
                !$("input[name='option-risk'][type='checkbox']:checked").length &&
                !$("input[name='option-resource-layer'][type='checkbox']:checked").length
            );
            if (allFillPolygonsUnchecked) this.mapLegend.empty();

            let oneHazardProjectSelected = $("input[name='option-hazard'][type='checkbox']:checked:not([value='multi_hazard'])").length;
            if (oneHazardProjectSelected && layerDetails.refText) {
                this.descCitation.empty().html(`<div class="p-2">${layerDetails.refText}</div>`).show();
            } else this.descCitation.empty().hide();
        });


        // 6. Risk Indicator - Filled Polygon
        this.accordionLabelRisk.empty();
        this.optionsRisk.empty().html(`<span class="text-dark">COMING SOON</span>`);

        // 7. Resource Layer - Raster
        this.optionsResourceLayer.empty().html(`<span class="text-dark">COMING SOON</span>`);

    }

    readData = (layerDetails) => {
        this.loadMapFile(`${layerDetails.folder}/${layerDetails.file}`)
        .then(topoResponse => {
            let geoData = topojson.feature(topoResponse, topoResponse.objects.collection);
            switch (layerDetails.featureType) {
                case "Polygon": this.drawPolygons(geoData, layerDetails); break;
                case "LineString": this.drawLineStrings(geoData, layerDetails); break;
                case "Point": this.drawPointMarkers(geoData, layerDetails); break;
                default: break;
            }
        })
        .catch(err => {
            this.pageAlert(`Unable to get ${layerDetails.name} layer`, 0);
            console.error(err);
        })
        .finally(() => this.stopWaiting());
    }

    drawPointMarkers = (geoData, layerDetails) => {
        let markers = L.layerGroup();
        let customIcon = L.icon({
            iconUrl: `assets/images/geospatial-icons/${layerDetails.type}.png`,
            iconSize: [32, 32],
            iconAnchor: [0, 32],
            tooltipAnchor: [16, 16],
        });
        geoData.features.forEach((feature) => {
            let latLng = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
            let marker = L.marker(latLng, { icon: customIcon, maxZoom: 15 });
            marker.addTo(markers);
            marker.on("mouseover", function (e) {
                let d = feature;
                let tooltipValue = d.properties[layerDetails.label2]
                    ? [d.properties[layerDetails.label1], d.properties[layerDetails.label2]].join(" | ")
                    : d.properties[layerDetails.label1];
                let tooltipContent = `${layerDetails.name}: ${tooltipValue}`;
                marker.bindTooltip(tooltipContent, {
                    direction: 'bottom',
                    offset: [0, -16],
                }).openTooltip();
            }).on("mouseout", function (e) {
                marker.unbindTooltip();
            });
        });
        markers.addTo(this.map);
        this.pointMarkerLayers[`point-${layerDetails.type}`] = markers;
    }

    removePointMarkers = (layerId) => {
        let markerLayer = this.pointMarkerLayers[layerId];
        if (markerLayer) {
            delete this.pointMarkerLayers[layerId];
            this.map.removeLayer(markerLayer);
        }
    }

    drawLineStrings = (geoData, layerDetails) => {
        let lineStrings = L.d3SvgOverlay((selection, projection) => {
            let pScale = projection.scale;
            let locationGroup = selection.selectAll("path").data(geoData.features);
            locationGroup.enter()
                .append("path")
                .attr("d", d => projection.pathFromGeojson(d))
                .attr("id", (d, i) => `${layerDetails.type}_${i}`)
                .attr("style", "z-index:4000;pointer-events:visiblePainted !important")
                .attr("fill", layerDetails.fill || "transparent")
                .attr("stroke", layerDetails.stroke)
                .attr("stroke-width", "1px")

            locationGroup.transition().duration(10).attr("stroke-width", `${1 / pScale}px`);
        }, { id: layerDetails.type });
        lineStrings.addTo(this.map);
    }


    drawPolygons = (geoData, layerDetails) => {
        this.descProjectList.empty().hide();
        if (layerDetails.folder == "projects") {
            geoData.features.forEach(feature => {
                feature.properties.project_count
                    = this.mapProjectData.find(b => b.province_id == feature.properties.province_id && b.category == layerDetails.name)?.count || 0;
            });
            this.displayProjectList(null, layerDetails.name, this.country)
        };

        let allProjectPolygonUnchecked = $("input[name='option-projects'][type='checkbox']:checked").length;
        if (!allProjectPolygonUnchecked) this.descProjectList.empty().hide();

        let oneHazardProjectSelected = $("input[name='option-hazard'][type='checkbox']:checked:not([value='multi_hazard'])").length;
        if (oneHazardProjectSelected && layerDetails.refText) {
            this.descCitation.empty().html(`<div class="p-2">${layerDetails.refText}</div>`).show();
        } else this.descCitation.empty().hide();

        let polygonFillIndex = layerDetails.needLegend
            ? layerDetails.variableLegend
                ? this.variableColorRange(
                    this.polygonFillIndex.filter(b => b.folder == layerDetails.folder && b.type == layerDetails.type),
                    geoData.features.map(b => b.properties),
                    layerDetails.label1
                )
                : this.polygonFillIndex.filter(b => b.folder == layerDetails.folder && b.type == layerDetails.type)
            : [];
        polygonFillIndex.length ? this.displayPolygonLegend(polygonFillIndex, layerDetails) : this.mapLegend.empty();

        let tooltip;
        let isTransparent = ["admin", "hydrology"].includes(layerDetails.folder);
        let polygons = L.d3SvgOverlay((selection, projection) => {
            let pScale = projection.scale;
            let locationGroup = selection.selectAll("path").data(geoData.features);
            locationGroup.enter()
                .append("path")
                .attr("d", d => projection.pathFromGeojson(d))
                .attr("id", (d, i) => `${layerDetails.type}_${i}`)
                .attr("style", "z-index:2000;pointer-events:visiblePainted !important;")
                .attr("fill", d => isTransparent
                    ? "transparent"
                    : this.getColorByPolygonValue(d.properties[layerDetails.label1], polygonFillIndex, layerDetails.nonNumericLegend)
                )
                .attr("fill-opacity", isTransparent ? 1 : 0.7)
                .attr("stroke", layerDetails.stroke)
                .attr("stroke-width", "0.5px")
                .on("mouseenter", (e, d, i) => {
                    d3.select(`${layerDetails.type}_${i}`).attr("cursor", "pointer");
                    let mainVal = !isNaN(d.properties[layerDetails.label1])
                        ? this.float2(d.properties[layerDetails.label1])
                        : d.properties[layerDetails.label1]
                    let tooltipValue = d.properties[layerDetails.label2]
                        ? [mainVal, d.properties[layerDetails.label2]].join(" | ")
                        : mainVal;
                    let tooltipContent = `${layerDetails.name}: ${tooltipValue}` || this.country;
                    tooltip = projection.layer.bindTooltip(tooltipContent).openTooltip(
                        L.latLng(projection.layerPointToLatLng(projection.pathFromGeojson.centroid(d)))
                    );
                })
                .on("mouseleave", (e, d, i) => tooltip?.closeTooltip())
                .on("click", (e, d) => {
                    switch (true) {
                        case layerDetails.folder == "projects":
                            if(d.properties.province_id && d.properties.project_count !== 0)
                                this.displayProjectList(d.properties.province_id, layerDetails.name, d.properties.ADM1_FR)
                            break;
                        default:
                            break;
                    }
                })
            locationGroup.transition().duration(10).attr("stroke-width", `${0.5 / pScale}px`);
        }, { id: layerDetails.type });
        polygons.addTo(this.map);
    }

    displayProjectList = (province_id, category, province_name) => {
        let requestBody = {
            "province_id": province_id,
            "country_id": this.countryId,
            "category_id": this.lookupData.find(b => b.table == "category").lookup_data.find(b => b.category == category).id
        }
        this.postApi(requestBody, this.authHeader, "projects/province")
        .then(response => {
            let descActionButton = province_id
                ? `<button class="btn" id="btn-reset-project-list"><i class="fa fa-undo" aria-hidden="true"></i></button>`
                : ``
            let header = `<div class="d-flex justify-content-between align-items-center flex-wrap mt-1 ps-3 p-3">
            <small><b>${province_name} | ${category} projects</b></small>${descActionButton}
        </div>`;
            if (response.success) {
                if (response.data.length) {
                    let listHtml = `<div style="height: auto; max-height: 45vh; overflow-y: scroll;">`
                        + response.data.map(a => {
                            let budget = a.funding_amount ? `<b>USD ${strNum(a.funding_amount)}</b>` : "N/A";
                            let start_year = a.start_year ? `<b>${a.start_year}</b>` : "N/A";
                            let end_year = a.end_year ? `<b>${a.end_year}</b>` : "N/A";
                            return `<div class="mb-1 p-3 border-top">
                            <small><b>${a.project_name.replace(/�/g, "")}</b></small>
                            <div class="row mt-1">
                                <div class="col-sm-6 col-md-6 col-lg-6"><small class="text-muted">Budget<br/>${budget}</small><br/></div>
                                <div class="col-sm-3 col-md-3 col-lg-3"><small class="text-muted">Start Year<br/>${start_year}</small><br/></div>
                                <div class="col-sm-3 col-md-3 col-lg-3"><small class="text-muted">End Year<br/>${end_year}</small><br/></div>
                            </div>
                        </div>`;
                        }).join("\n")
                        + `</div>`;
                    this.descProjectList.empty().html(header + listHtml).show();
                } else {
                    let noticeHtml = `<div class="p-2 text-center"><small>Unavailable</small></div>`;
                    this.descProjectList.empty().html(header + noticeHtml).show();
                }

                $("button#btn-reset-project-list").on("click", () => this.displayProjectList(null, category, this.country));
            } else {
                this.descProjectList.empty().hide()
            }
        })
        .catch(err => {
            this.pageAlert("Issue in getting data for this province", 0);
            console.error(err);
        })
        .finally(this.stopWaiting)
    }


    removeSvgGroupById = (idName) => {
        this.map.eachLayer((l) => {
            if (l.options.id && l.options.id.indexOf(idName) === 0) this.map.removeLayer(l);
        });
    }

    displayPolygonLegend = (polygonFillIndex, layerDetails) => {
        let legendHtml = polygonFillIndex.map(a => {
            let label = layerDetails.showNumRangeInLegend ? `${a.label} (${a.min}-${a.max})` : a.label;
            return `<div style="display: flex; align-items: center;">
                <div style="background-color: ${a.color}; height: 15px; width: 15px;"></div>
                <div style="margin-left: 5px; color: black;">&nbsp;${label}</div>
            </div>`;
        }).join("\n");
        this.mapLegend.empty().html(legendHtml);
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
                label: min != max ? `${this.float1(min)} - ${this.float1(max)}` : `${this.float1(max)}`
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


    getColorByPolygonValue = (value, polygonFillIndex, isNonNumericLegend) => {
        return isNonNumericLegend
            ? polygonFillIndex.find(b => b.discrete == value)?.color || "transparent"
            : polygonFillIndex.find(b => b.min <= value && b.max >= value)?.color || "transparent";
    }


    overlayRaster = (layerDetails) => {
        let baseWMSUrl = `${this.geoserverHost}/geoserver/${layerDetails.workspace}/wms`;
        let wmsLayer = L.tileLayer.betterWms(baseWMSUrl, {
            layers: `${layerDetails.layer}`,
            transparent: true,
            format: 'image/png',
            opacity: 4 / 5
        });
        let baseWMSLegendUrl = `${baseWMSUrl}?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=${layerDetails.workspace}:${layerDetails.layer}`;
        this.mapLegend.empty().html(`<img src="${baseWMSLegendUrl}" />`);
        return wmsLayer;
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
        });
    }

    getApi = (reqHead, path) => {
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

    loadExcelFile = (fileName) => new Promise((resolve, reject) => {
        this.startWaiting();
        fetch(`./assets/vector_maps/senegal/${fileName}`).then(res => res.blob()).then(file => {
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
        });
    }

    loadMapFile = (mapFile) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "GET",
                "beforeSend": () => this.startWaiting(),
                "url": `./assets/vector_maps/senegal/${mapFile}`,
                "success": response => typeof (response) == "string" ? resolve(JSON.parse(response)) : resolve(response),
                "error": err => reject(err)
            });
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
    sumArray = (arr) => arr.reduce((a, b) => a + b, 0);
    num = (val) => !isNaN(val) ? parseFloat(val) : 0;
    float1 = (num) => Number.isInteger(num) ? num : num.toFixed(1);
    float2 = (num) => Number.isInteger(num) ? num : num.toFixed(2);

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