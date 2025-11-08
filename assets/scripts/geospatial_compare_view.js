$(window).on("load", () => {
    let urlSearchParams = new URLSearchParams(window.location.search);
    let countryId = urlSearchParams.get("country_id");
    let criteria = urlSearchParams.get("criteria");

    switch(true){
        case countryId == 4: // SRILANKA
            let compareSL = new SrilankaGeoCompare(criteria);
            ["hazard", "risk"].includes(criteria)
                ? compareSL.init()
                : compareSL.pageAlert("Invalid layer in the url params, please check", 0);
            break;
        case countryId == 2: // ZAMBIA
            let compareZM = new ZambiaGeoCompare(criteria);
            ["hazard", "risk"].includes(criteria)
                ? compareZM.init()
                : compareZM.pageAlert("Invalid layer in the url params, please check", 0);
            break;
        case countryId == 7: // SENEGAL
            let compareSN = new SenegalGeoCompare(criteria);
            ["hazard"].includes(criteria)
                ? compareSN.init()
                : compareSN.pageAlert("Invalid layer in the url params, please check", 0);
            break;
        case countryId == 5: // KENYA
            let compareKE = new KenyaGeoCompare(criteria);
            ["hazard"].includes(criteria)
                ? compareKE.init()
                : compareKE.pageAlert("Invalid layer in the url params, please check", 0);
            break;
        default:
            let alertIcon = `<img src="assets/images/success-false.png"><h5 class="success-text-popup my-2">ERROR!</h5>`;
            $("div#icon-alert-modal").empty().html(alertIcon);
            $("h5#text-alert-modal").empty().html("Invalid country index in the url params, please check");
            $("div.modal#alertModal").modal("show");
            break;

    }
});

class SrilankaGeoCompare{
    constructor(criteria){
        this.criteria = criteria;
        this.apiUrl = apiUrl;
        this.countryId = 4;
        this.country = "Sri Lanka";
        this.mapsFolder = "srilanka";
        this.centerCoordinates = [7.8731, 80.7718];
        this.vectorIndex = [];
        this.polygonFillIndex = [];
        this.resourceLayerIndex = [];
        this.backButton = $("a#back-button")

        // option holders
        this.criteriaAccordionIndex = {
            "risk": {"title": " Risk Indicator", "image": "risk-indicator.svg"},
            "hazard": {"title": " Hazard", "image": "hazard1.svg"},
        };
        this.criteriaAccordion = `<div class="accordion-item bg-transparent border-0">
            <h2 class="accordion-header" id="heading-${this.criteria}-compare">
                <button class="accordion-button" type="button"
                    data-bs-toggle="collapse" data-bs-target="#collapse-${this.criteria}-compare" aria-expanded="true"
                    aria-controls="collapse-${this.criteria}-compare">
                    <img src="./assets/images/${this.criteriaAccordionIndex[this.criteria].image}">
                    <span class="pl-1">${this.criteriaAccordionIndex[this.criteria].title}</span>
                </button>
            </h2>
            <div id="collapse-${this.criteria}-compare" class="accordion-collapse "
                aria-labelledby="heading-${this.criteria}-compare" data-bs-parent="#heading-${this.criteria}-compare">
                <div class="accordion-body">
                    <div class="row">
                        <div class="col-sm-12 col-md-12 col-lg-12">
                            <div class="form-group my-3" id="options-${this.criteria}-compare"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        this.accordionParent = $("div#comparison-layer-accordion");
        this.selectedVectorIndex = [];
        this.captureButton = $("button#capture-btn");

        // map container panel
        this.comparePanel = $("div#comparison-map-panel");
        this.backgroundTilesLayer = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png";

        // cookies
        this.cookieObject = getCookies(document.cookie);
        this.jwt = this.cookieObject.jwt;
        this.userEmail = this.cookieObject.userEmail;
        this.isLoggedIn = this.cookieObject.isLoggedIn;
        this.authHeader = {"Authorization": this.jwt};
        this.logoutLink = $("a#link-logout");
        this.userMgmtLink = $("li#user-management-link");
        this.loggedInUserEmailLabel = $("li#user-email-label");
        
    }

    onLogoutClick = () => {
        document.cookie = `userEmail=null`;
        document.cookie = `jwt=null`;
        document.cookie = `isLoggedIn=false`;
        document.cookie = `userRoleId=null`;
        this.pageAlert("Logged out successfully", 0);
        setTimeout(() => window.location.replace("index.html"), 1000);
    }

    init = () => {
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.backButton.on("click",() =>  window.close())
        this.logoutLink.on("click", this.onLogoutClick);
        this.loadData();
    }

    loadData = () => {
        Promise.allSettled([
            this.loadExcelFile("srilanka_layer_index.xlsx")
        ])
        .then(responses => {
            responses.forEach((response, i) => {
                switch(true){
                    case i == 0: // Country's layer index
                        if (response.status == "fulfilled") 
                            [this.vectorIndex, this.polygonFillIndex, this.resourceLayerIndex]
                                = this.excelToArray(response.value, "vectorIndex", "polygonFillIndex", "resourceLayerIndex");
                        else this.pageAlert("Issue in loading Sri Lanka's layer index sheet", 0);
                        break;
                    default:
                        break;
                }
            })
        })
        .then(() => {
            this.accordionParent.empty().html(this.criteriaAccordion);
            this.accordionChild = $(`div#options-${this.criteria}-compare`);
        })
        .then(this.fillLayerOptions)
        .then(() => {
            let initialLayersOnLoad = Array.from($(`input[type="checkbox"][name="option-${this.criteria}"][data-init-load="1"]`));
            initialLayersOnLoad.forEach(a => setTimeout(() => $(a).prop("checked", true).trigger("change"), 100));
        })
        .then(this.enableScreenshot)
        .catch(err => {
            console.error(err);
            this.pageAlert("Issue in loading initial data, please contact dev team", 0);
        })
        .finally(this.stopWaiting);
    }

    fillLayerOptions = () => {
        // 1. Hazard - Filled Polygon
        let hazardDetails = this.vectorIndex.filter(a => a.folder == "hazard" && a.status);
        let hazardOptions = hazardDetails.map(a => {
            return `<div class="form-check">
                <input class="form-check-input" type="checkbox" name="option-${a.folder}" value="${a.type}" data-init-load="${a.compareInitLoad}">
                <label class="form-check-labels ms-2 text-white pl-1">${a.name}</label>
            </div>`;
        }).join("\n");

        // 2. Risk Indicator - Filled Polygon
        let riskDetails = this.vectorIndex.filter(a => a.folder == "risk" && a.status);
        let riskGroups = this.uqArray(riskDetails.map(a => a.group));
        let riskOptions =  riskGroups.map(a => {
            let riskGroupOptions = riskDetails.filter(b => b.group == a).map(b => {
                return `<div class="form-check ml-3">
                    <input class="form-check-input" type="checkbox" name="option-${b.folder}" value="${b.type}" data-init-load="${b.compareInitLoad}" data-group-id="risk-group-${a}">
                    <label class="form-check-labels ms-2 text-white pl-1">${b.name}</label>
                </div>`;
            }).join("\n");
            let groupRadioButton = `
                <div class="form-check text-white mb-2" style="border: 1px solid #D0D5DD;margin: 2px 4px;min-height: 30px;border-radius: 6px; background: #D0D5DD;">
                    <label class="form-check-label ml-1 text-white">${a}</label>
                    <input class="form-check-input" type="checkbox" data-id="risk-group-${a}" name="risk-group" />
                </div>
                <div class="risk-group-child" id="risk-group-${a}">${riskGroupOptions}</div>
            `;
            return groupRadioButton;
        }).join("\n");


        // Single child select from criteria
        let optionsToFill = {
            "risk": riskOptions, 
            "hazard": hazardOptions
        };
        this.accordionChild.empty().html(optionsToFill[this.criteria]);

        setTimeout(() => {
            $(`input[type="checkbox"][name="option-${this.criteria}"]`).on("change", e => {
                this.comparePanel.empty();
                let checkedItems = $(`input[type="checkbox"][name="option-${this.criteria}"]`)
                        .filter(":checked") // Only checked checkboxes
                        .map((_, checkbox) => $(checkbox).val())
                        .get();
                this.selectedVectorIndex = checkedItems.length
                    ? this.vectorIndex.filter(b => checkedItems.includes(b.type))
                    : [];
                this.refreshComparePane();

                if(this.criteria == "risk"){
                    $("input[type='checkbox'][name^='option-']").on("change", function () {
                        let groupId = $(e.currentTarget).data("group-id");
                        let groupCheckbox = $(`input[type='checkbox'][data-id='${groupId}']`);
                        $(`input[type='checkbox'][data-group-id='${groupId}']:checked`).length 
                            === $(`input[type='checkbox'][data-group-id='${groupId}']`).length
                            ? groupCheckbox.prop("checked", true)
                            : groupCheckbox.prop("checked", false);

                    });
                }
            })

            if(this.criteria == "risk"){
                $("input[type='checkbox'][name='risk-group']").on("change", e => {
                    let groupId = $(e.currentTarget).data("id");
                    let checkboxes = $(`input[type='checkbox'][data-group-id='${groupId}']`);
                    $(e.currentTarget).prop("checked")
                        ? checkboxes.prop("checked", true).trigger("change")
                        : checkboxes.prop("checked", false).trigger("change"); 
                });
            }
        }, 100);
    }


    refreshComparePane = () => {
        let paneHtml = this.selectedVectorIndex.map(a => {
            let cardTitle = a.folder == "risk" ? `${a.group} - ${a.name}` : a.name;
            return `<div class="col-sm-12 col-md-4 col-lg-4">
                <div class="card  border-1 card_campare">
                    <div class="card-header border-0">
                        <div class="d-flex justify-content-between align-items-center">
                            <div><h5 class="card-title-text text-dark mb-0">${cardTitle}</h5></div>
                        </div>
                    </div>
                    <div class="card-body p-2 pt-0" style="width: 100%; height: 50vh;" id="map-pane-${a.type}">
                        <div style="top: 10px; right: 10px; position: absolute; z-index: 1000;" id="map-legend-${a.type}"></div>
                    </div>
                </div>
            </div>`;
        }).join("\n");
        this.comparePanel.empty().html(paneHtml);

        setTimeout(() => {
            this.selectedVectorIndex.forEach(layerDetails => {
                let mapContainerObj = L.map(`map-pane-${layerDetails.type}`, {fullscreenControl: true, zoomControl: true, attributionControl: false});
                let tileLayer = L.tileLayer(this.backgroundTilesLayer, {attribution: null});
                tileLayer.addTo(mapContainerObj);
                mapContainerObj.setView(this.centerCoordinates, 7);
                mapContainerObj.touchZoom.disable();
                mapContainerObj.doubleClickZoom.disable();
                mapContainerObj.scrollWheelZoom.disable();
                mapContainerObj.boxZoom.disable();
                this.readData(layerDetails, mapContainerObj, $(`div#map-legend-${layerDetails.type}`));
                mapContainerObj.on('fullscreenchange', function () {
                    mapContainerObj.isFullscreen()
                        ? mapContainerObj.setZoom(mapContainerObj.getZoom() + 1)
                        : mapContainerObj.setZoom(mapContainerObj.getZoom() - 1);
                });
            });
        }, 0);
    }

    readData = (layerDetails, mapContainerObj, mapLegendObj) => {
        this.loadMapFile(`${layerDetails.folder}/${layerDetails.file}`)
        .then(topoResponse => {
            let geoData = topojson.feature(topoResponse, topoResponse.objects.collection);
            this.drawPolygons(geoData, layerDetails, mapContainerObj, mapLegendObj);
        })
        .catch(err => {
            this.pageAlert(`Unable to get ${layerDetails.name} layer`, 0);
            console.error(err);
        })
        .finally(() => this.stopWaiting());
    }

    drawPolygons = (geoData, layerDetails, mapContainerObj, mapLegendObj) => {
        let polygonFillIndex = layerDetails.needLegend
            ? this.polygonFillIndex.filter(b => b.folder == layerDetails.folder && b.type == layerDetails.type)
            : [];
        if(polygonFillIndex.length) this.displayPolygonLegend(mapLegendObj, polygonFillIndex);
        let tooltip;
        let polygons = L.d3SvgOverlay((selection, projection) => {
            let pScale = projection.scale;
            let locationGroup = selection.selectAll("path").data(geoData.features);
            locationGroup.enter()
                .append("path")
                .attr("d", d => projection.pathFromGeojson(d))
                .attr("id", (d, i) => `${layerDetails.type}_${i}`)
                .attr("style", "z-index:2000;pointer-events:visiblePainted !important;")
                .attr("fill", d => this.getColorByPolygonValue(d.properties[layerDetails.label1], polygonFillIndex, layerDetails.nonNumericLegend))
                .attr("fill-opacity", 4/5)
                .attr("stroke", layerDetails.stroke)
                .attr("stroke-width", "0.5px")
                .on("mouseenter", (e, d, i) => {
                    d3.select(`${layerDetails.type}_${i}`).attr("cursor", "pointer");
                    let mainVal = !isNaN(d.properties[layerDetails.label1]) 
                        ? this.formatFloat(d.properties[layerDetails.label1])
                        : d.properties[layerDetails.label1]
                    let tooltipValue = d.properties[layerDetails.label2] 
                        ? [mainVal, d.properties[layerDetails.label2]].join(" | ")
                        : mainVal;
                    let tooltipContent = `${layerDetails.name}: ${tooltipValue}` || this.country;
                    tooltip = projection.layer.bindTooltip(tooltipContent).openTooltip(
                        L.latLng(projection.layerPointToLatLng(projection.pathFromGeojson.centroid(d)))
                    );
                })
                .on("mouseleave", (e, d) => tooltip?.closeTooltip())
            locationGroup.transition().duration(10).attr("stroke-width", `${0.5/pScale}px`);
        });
        polygons.addTo(mapContainerObj);

    }

    displayPolygonLegend = (mapLegendObj, polygonFillIndex) => {
        let legendHtml = polygonFillIndex.map(a => {
            return `<div style="display: flex; align-items: center;">
                <div style="background-color: ${a.color}; height: 15px; width: 15px;"></div>
                <div class="text-dark" style="margin-left: 5px;">&nbsp;${a.label}</div>
            </div>`;
        }).join("\n");
        mapLegendObj.empty().html(legendHtml);
    }

    getColorByPolygonValue = (value, polygonFillIndex, isNonNumericLegend) => {
        return isNonNumericLegend
            ? polygonFillIndex.find(b => b.discrete == value)?.color || "transparent"
            : polygonFillIndex.find(b => b.min <= value && b.max >= value)?.color || "transparent";
    }


    enableScreenshot = () => {
		this.captureButton.on('click', () => {
			this.startWaiting();
			const container = document.querySelector('div#comparison-map-panel');
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
        });
    }

    loadExcelFile = (fileName) => new Promise((resolve, reject) => {
        this.startWaiting();
        fetch(`./assets/vector_maps/srilanka/${fileName}`).then(res => res.blob()).then(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const bstr= e.target.result;
                resolve(bstr)
            }
            reader.readAsBinaryString(file);
        }).catch(err => reject(err))
    });

    excelToArray = (file, ...sheets) => {
        let wb = XLSX.read(file, {type: 'binary'});
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
                "success": response => typeof(response) == "string" ? resolve(JSON.parse(response)) : resolve(response),
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
    formatFloat = (num) => Number.isInteger(num) ? num : num.toFixed(2);

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

class KenyaGeoCompare{
    constructor(criteria){
        this.criteria = criteria;
        this.apiUrl = apiUrl;
        this.countryId = 5;
        this.country = "Kenya";
        this.mapsFolder = "kenya";
        this.centerCoordinates = [0.4236, 37.9062];
        this.vectorIndex = [];
        this.polygonFillIndex = [];
        this.resourceLayerIndex = [];
        this.backButton = $("a#back-button")

        // option holders
        this.criteriaAccordionIndex = {
            "risk": {"title": " Risk Indicator", "image": "risk-indicator.svg"},
            "hazard": {"title": " Hazard", "image": "hazard1.svg"},
        };
        this.criteriaAccordion = `<div class="accordion-item bg-transparent border-0">
            <h2 class="accordion-header" id="heading-${this.criteria}-compare">
                <button class="accordion-button bg-btn" type="button"
                    data-bs-toggle="collapse" data-bs-target="#collapse-${this.criteria}-compare" aria-expanded="true"
                    aria-controls="collapse-${this.criteria}-compare">
                    <img src="./assets/images/${this.criteriaAccordionIndex[this.criteria].image}">
                    <span class="pl-1">${this.criteriaAccordionIndex[this.criteria].title}</span>
                </button>
            </h2>
            <div id="collapse-${this.criteria}-compare" class="accordion-collapse "
                aria-labelledby="heading-${this.criteria}-compare" data-bs-parent="#heading-${this.criteria}-compare">
                <div class="accordion-body">
                    <div class="row">
                        <div class="col-sm-12 col-md-12 col-lg-12">
                            <div class="form-group my-3" id="options-${this.criteria}-compare"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        this.accordionParent = $("div#comparison-layer-accordion");
        this.selectedVectorIndex = [];
        this.captureButton = $("button#capture-btn");

        // map container panel
        this.comparePanel = $("div#comparison-map-panel");
        this.backgroundTilesLayer = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png";

        // cookies
        this.cookieObject = getCookies(document.cookie);
        this.jwt = this.cookieObject.jwt;
        this.userEmail = this.cookieObject.userEmail;
        this.isLoggedIn = this.cookieObject.isLoggedIn;
        this.authHeader = {"Authorization": this.jwt};
        this.logoutLink = $("a#link-logout");
        this.userMgmtLink = $("li#user-management-link");
        this.loggedInUserEmailLabel = $("li#user-email-label");
        
    }

    onLogoutClick = () => {
        document.cookie = `userEmail=null`;
        document.cookie = `jwt=null`;
        document.cookie = `isLoggedIn=false`;
        document.cookie = `userRoleId=null`;
        this.pageAlert("Logged out successfully", 0);
        setTimeout(() => window.location.replace("index.html"), 1000);
    }

    init = () => {
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.backButton.on("click",() =>  window.close())
        this.logoutLink.on("click", this.onLogoutClick);
        this.loadData();
    }

    loadData = () => {
        Promise.allSettled([
            this.loadExcelFile("kenya_layer_index.xlsx")
        ])
        .then(responses => {
            responses.forEach((response, i) => {
                switch(true){
                    case i == 0: // Country's layer index
                        if (response.status == "fulfilled") 
                            [this.vectorIndex, this.polygonFillIndex, this.resourceLayerIndex]
                                = this.excelToArray(response.value, "vectorIndex", "polygonFillIndex", "resourceLayerIndex");
                        else this.pageAlert("Issue in loading Kenya's layer index sheet", 0);
                        break;
                    default:
                        break;
                }
            })
        })
        .then(() => {
            this.accordionParent.empty().html(this.criteriaAccordion);
            this.accordionChild = $(`div#options-${this.criteria}-compare`);
        })
        .then(this.fillLayerOptions)
        .then(() => {
            let initialLayersOnLoad = Array.from($(`input[type="checkbox"][name="option-${this.criteria}"][data-init-load="1"]`));
            initialLayersOnLoad.forEach(a => setTimeout(() => $(a).prop("checked", true).trigger("change"), 100));
        })
        .then(this.enableScreenshot)
        .catch(err => {
            console.error(err);
            this.pageAlert("Issue in loading initial data, please contact dev team", 0);
        })
        .finally(this.stopWaiting);
    }

    fillLayerOptions = () => {
        // 1. Hazard - Filled Polygon
        let hazardDetails = this.vectorIndex.filter(a => a.folder == "hazard" && a.status);
        let hazardOptions = hazardDetails.map(a => {
            return `<div class="form-check">
                <input class="form-check-input" type="checkbox" name="option-${a.folder}" value="${a.type}" data-init-load="${a.compareInitLoad}">
                <label class="form-check-labels ms-2 text-white pl-1">${a.name}</label>
            </div>`;
        }).join("\n");

        // 2. Risk Indicator - Filled Polygon
        let riskDetails = this.vectorIndex.filter(a => a.folder == "risk" && a.status);
        let riskGroups = this.uqArray(riskDetails.map(a => a.group));
        let riskOptions =  riskGroups.map(a => {
            let riskGroupOptions = riskDetails.filter(b => b.group == a).map(b => {
                return `<div class="form-check ml-3">
                    <input class="form-check-input" type="checkbox" name="option-${b.folder}" value="${b.type}" data-init-load="${b.compareInitLoad}" data-group-id="risk-group-${a}">
                    <label class="form-check-labels ms-2 text-white pl-1">${b.name}</label>
                </div>`;
            }).join("\n");
            let groupRadioButton = `
                <div class="form-check text-white mb-2" style="border: 1px solid #D0D5DD;margin: 2px 4px;min-height: 30px;border-radius: 6px; background: #D0D5DD;">
                    <label class="form-check-label ml-1 text-white">${a}</label>
                    <input class="form-check-input" type="checkbox" data-id="risk-group-${a}" name="risk-group" />
                </div>
                <div class="risk-group-child" id="risk-group-${a}">${riskGroupOptions}</div>
            `;
            return groupRadioButton;
        }).join("\n");


        // Single child select from criteria
        let optionsToFill = {
            "risk": riskOptions, 
            "hazard": hazardOptions
        };
        this.accordionChild.empty().html(optionsToFill[this.criteria]);

        setTimeout(() => {
            $(`input[type="checkbox"][name="option-${this.criteria}"]`).on("change", e => {
                this.comparePanel.empty();
                let checkedItems = $(`input[type="checkbox"][name="option-${this.criteria}"]`)
                        .filter(":checked") // Only checked checkboxes
                        .map((_, checkbox) => $(checkbox).val())
                        .get();
                this.selectedVectorIndex = checkedItems.length
                    ? this.vectorIndex.filter(b => checkedItems.includes(b.type))
                    : [];
                this.refreshComparePane();

                if(this.criteria == "risk"){
                    $("input[type='checkbox'][name^='option-']").on("change", function () {
                        let groupId = $(e.currentTarget).data("group-id");
                        let groupCheckbox = $(`input[type='checkbox'][data-id='${groupId}']`);
                        $(`input[type='checkbox'][data-group-id='${groupId}']:checked`).length 
                            === $(`input[type='checkbox'][data-group-id='${groupId}']`).length
                            ? groupCheckbox.prop("checked", true)
                            : groupCheckbox.prop("checked", false);

                    });
                }
            })

            if(this.criteria == "risk"){
                $("input[type='checkbox'][name='risk-group']").on("change", e => {
                    let groupId = $(e.currentTarget).data("id");
                    let checkboxes = $(`input[type='checkbox'][data-group-id='${groupId}']`);
                    $(e.currentTarget).prop("checked")
                        ? checkboxes.prop("checked", true).trigger("change")
                        : checkboxes.prop("checked", false).trigger("change"); 
                });
            }
        }, 100);
    }


    refreshComparePane = () => {
        let paneHtml = this.selectedVectorIndex.map(a => {
            let cardTitle = a.folder == "risk" ? `${a.group} - ${a.name}` : a.name;
            return `<div class="col-sm-12 col-md-4 col-lg-4">
                <div class="card border-1 card_campare">
                    <div class="card-header bg-white border-0">
                        <div class="d-flex justify-content-between align-items-center">
                            <div><h5 class="card-title-text mb-0">${cardTitle}</h5></div>
                        </div>
                    </div>
                    <div class="card-body p-2 pt-0" style="width: 100%; height: 50vh;" id="map-pane-${a.type}">
                        <div style="top: 10px; right: 10px; position: absolute; z-index: 1000;" id="map-legend-${a.type}"></div>
                    </div>
                </div>
            </div>`;
        }).join("\n");
        this.comparePanel.empty().html(paneHtml);

        setTimeout(() => {
            this.selectedVectorIndex.forEach(layerDetails => {
                let mapContainerObj = L.map(`map-pane-${layerDetails.type}`, {fullscreenControl: true, zoomControl: true, attributionControl: false});
                let tileLayer = L.tileLayer(this.backgroundTilesLayer, {attribution: null});
                tileLayer.addTo(mapContainerObj);
                mapContainerObj.setView(this.centerCoordinates, 5.4);
                mapContainerObj.touchZoom.disable();
                mapContainerObj.doubleClickZoom.disable();
                mapContainerObj.scrollWheelZoom.disable();
                mapContainerObj.boxZoom.disable();
                this.readData(layerDetails, mapContainerObj, $(`div#map-legend-${layerDetails.type}`));
                mapContainerObj.on('fullscreenchange', function () {
                    mapContainerObj.isFullscreen()
                        ? mapContainerObj.setZoom(mapContainerObj.getZoom() + 1)
                        : mapContainerObj.setZoom(mapContainerObj.getZoom() - 1);
                });
            });
        }, 0);
    }

    readData = (layerDetails, mapContainerObj, mapLegendObj) => {
        this.loadMapFile(`${layerDetails.folder}/${layerDetails.file}`)
        .then(topoResponse => {
            let geoData = topojson.feature(topoResponse, topoResponse.objects.collection);
            this.drawPolygons(geoData, layerDetails, mapContainerObj, mapLegendObj);
        })
        .catch(err => {
            this.pageAlert(`Unable to get ${layerDetails.name} layer`, 0);
            console.error(err);
        })
        .finally(() => this.stopWaiting());
    }

    drawPolygons = (geoData, layerDetails, mapContainerObj, mapLegendObj) => {
        let polygonFillIndex = layerDetails.needLegend
            ? this.polygonFillIndex.filter(b => b.folder == layerDetails.folder && b.type == layerDetails.type)
            : [];
        if(polygonFillIndex.length) this.displayPolygonLegend(mapLegendObj, polygonFillIndex);
        let tooltip;
        let polygons = L.d3SvgOverlay((selection, projection) => {
            let pScale = projection.scale;
            let locationGroup = selection.selectAll("path").data(geoData.features);
            locationGroup.enter()
                .append("path")
                .attr("d", d => projection.pathFromGeojson(d))
                .attr("id", (d, i) => `${layerDetails.type}_${i}`)
                .attr("style", "z-index:2000;pointer-events:visiblePainted !important;")
                .attr("fill", d => this.getColorByPolygonValue(d.properties[layerDetails.label1], polygonFillIndex, layerDetails.nonNumericLegend))
                .attr("fill-opacity", 4/5)
                .attr("stroke", layerDetails.stroke)
                .attr("stroke-width", "0.5px")
                .on("mouseenter", (e, d, i) => {
                    d3.select(`${layerDetails.type}_${i}`).attr("cursor", "pointer");
                    let mainVal = !isNaN(d.properties[layerDetails.label1]) 
                        ? this.formatFloat(d.properties[layerDetails.label1])
                        : d.properties[layerDetails.label1]
                    let tooltipValue = d.properties[layerDetails.label2] 
                        ? [mainVal, d.properties[layerDetails.label2]].join(" | ")
                        : mainVal;
                    let tooltipContent = `${layerDetails.name}: ${tooltipValue}` || this.country;
                    tooltip = projection.layer.bindTooltip(tooltipContent).openTooltip(
                        L.latLng(projection.layerPointToLatLng(projection.pathFromGeojson.centroid(d)))
                    );
                })
                .on("mouseleave", (e, d) => tooltip?.closeTooltip())
            locationGroup.transition().duration(10).attr("stroke-width", `${0.5/pScale}px`);
        });
        polygons.addTo(mapContainerObj);

    }

    displayPolygonLegend = (mapLegendObj, polygonFillIndex) => {
        let legendHtml = polygonFillIndex.map(a => {
            return `<div style="display: flex; align-items: center;">
                <div style="background-color: ${a.color}; height: 15px; width: 15px;"></div>
                <div class="text-dark" style="margin-left: 5px;">&nbsp;${a.label}</div>
            </div>`;
        }).join("\n");
        mapLegendObj.empty().html(legendHtml);
    }

    getColorByPolygonValue = (value, polygonFillIndex, isNonNumericLegend) => {
        return isNonNumericLegend
            ? polygonFillIndex.find(b => b.discrete == value)?.color || "transparent"
            : polygonFillIndex.find(b => b.min <= value && b.max >= value)?.color || "transparent";
    }


    enableScreenshot = () => {
		this.captureButton.on('click', () => {
			this.startWaiting();
			const container = document.querySelector('div#comparison-map-panel');
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
        });
    }

    loadExcelFile = (fileName) => new Promise((resolve, reject) => {
        this.startWaiting();
        fetch(`./assets/vector_maps/kenya/${fileName}`).then(res => res.blob()).then(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const bstr= e.target.result;
                resolve(bstr)
            }
            reader.readAsBinaryString(file);
        }).catch(err => reject(err))
    });

    excelToArray = (file, ...sheets) => {
        let wb = XLSX.read(file, {type: 'binary'});
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
                "success": response => typeof(response) == "string" ? resolve(JSON.parse(response)) : resolve(response),
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
    formatFloat = (num) => Number.isInteger(num) ? num : num.toFixed(2);

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

class SenegalGeoCompare{
    constructor(criteria){
        this.criteria = criteria;
        this.apiUrl = apiUrl;
        this.countryId = 7;
        this.country = "Senegal";
        this.mapsFolder = "senegal";
        this.centerCoordinates = [14.4974, -14.4524];
        this.vectorIndex = [];
        this.polygonFillIndex = [];
        this.resourceLayerIndex = [];
        this.backButton = $("a#back-button")

        // option holders
        this.criteriaAccordionIndex = {
            "risk": {"title": " Risk Indicator", "image": "risk-indicator.svg"},
            "hazard": {"title": " Hazard", "image": "hazard1.svg"},
        };
        this.criteriaAccordion = `<div class="accordion-item bg-transparent border-0">
            <h2 class="accordion-header" id="heading-${this.criteria}-compare">
                <button class="accordion-button bg-btn" type="button"
                    data-bs-toggle="collapse" data-bs-target="#collapse-${this.criteria}-compare" aria-expanded="true"
                    aria-controls="collapse-${this.criteria}-compare">
                    <img src="./assets/images/${this.criteriaAccordionIndex[this.criteria].image}">
                    <span class="pl-1">${this.criteriaAccordionIndex[this.criteria].title}</span>
                </button>
            </h2>
            <div id="collapse-${this.criteria}-compare" class="accordion-collapse "
                aria-labelledby="heading-${this.criteria}-compare" data-bs-parent="#heading-${this.criteria}-compare">
                <div class="accordion-body">
                    <div class="row">
                        <div class="col-sm-12 col-md-12 col-lg-12">
                            <div class="form-group my-3" id="options-${this.criteria}-compare"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        this.accordionParent = $("div#comparison-layer-accordion");
        this.selectedVectorIndex = [];
        this.captureButton = $("button#capture-btn");

        // map container panel
        this.comparePanel = $("div#comparison-map-panel");
        this.backgroundTilesLayer = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png";

        // cookies
        this.cookieObject = getCookies(document.cookie);
        this.jwt = this.cookieObject.jwt;
        this.userEmail = this.cookieObject.userEmail;
        this.isLoggedIn = this.cookieObject.isLoggedIn;
        this.authHeader = {"Authorization": this.jwt};
        this.logoutLink = $("a#link-logout");
        this.userMgmtLink = $("li#user-management-link");
        this.loggedInUserEmailLabel = $("li#user-email-label");
        
    }

    onLogoutClick = () => {
        document.cookie = `userEmail=null`;
        document.cookie = `jwt=null`;
        document.cookie = `isLoggedIn=false`;
        document.cookie = `userRoleId=null`;
        this.pageAlert("Logged out successfully", 0);
        setTimeout(() => window.location.replace("index.html"), 1000);
    }

    init = () => {
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.backButton.on("click",() =>  window.close())
        this.logoutLink.on("click", this.onLogoutClick);
        this.loadData();
    }

    loadData = () => {
        Promise.allSettled([
            this.loadExcelFile("senegal_layer_index.xlsx")
        ])
        .then(responses => {
            responses.forEach((response, i) => {
                switch(true){
                    case i == 0: // Country's layer index
                        if (response.status == "fulfilled") 
                            [this.vectorIndex, this.polygonFillIndex, this.resourceLayerIndex]
                                = this.excelToArray(response.value, "vectorIndex", "polygonFillIndex", "resourceLayerIndex");
                        else this.pageAlert("Issue in loading Senegal's layer index sheet", 0);
                        break;
                    default:
                        break;
                }
            })
        })
        .then(() => {
            this.accordionParent.empty().html(this.criteriaAccordion);
            this.accordionChild = $(`div#options-${this.criteria}-compare`);
        })
        .then(this.fillLayerOptions)
        .then(() => {
            let initialLayersOnLoad = Array.from($(`input[type="checkbox"][name="option-${this.criteria}"][data-init-load="1"]`));
            initialLayersOnLoad.forEach(a => setTimeout(() => $(a).prop("checked", true).trigger("change"), 100));
        })
        .then(this.enableScreenshot)
        .catch(err => {
            console.error(err);
            this.pageAlert("Issue in loading initial data, please contact dev team", 0);
        })
        .finally(this.stopWaiting);
    }

    fillLayerOptions = () => {
        // 1. Hazard - Filled Polygon
        let hazardDetails = this.vectorIndex.filter(a => a.folder == "hazard" && a.status);
        let hazardOptions = hazardDetails.map(a => {
            return `<div class="form-check">
                <input class="form-check-input" type="checkbox" name="option-${a.folder}" value="${a.type}" data-init-load="${a.compareInitLoad}">
                <label class="form-check-labels ms-2 text-white pl-1">${a.name}</label>
            </div>`;
        }).join("\n");

        // 2. Risk Indicator - Filled Polygon
        let riskDetails = this.vectorIndex.filter(a => a.folder == "risk" && a.status);
        let riskGroups = this.uqArray(riskDetails.map(a => a.group));
        let riskOptions =  riskGroups.map(a => {
            let riskGroupOptions = riskDetails.filter(b => b.group == a).map(b => {
                return `<div class="form-check ml-3">
                    <input class="form-check-input" type="checkbox" name="option-${b.folder}" value="${b.type}" data-init-load="${b.compareInitLoad}" data-group-id="risk-group-${a}">
                    <label class="form-check-labels ms-2 text-white pl-1">${b.name}</label>
                </div>`;
            }).join("\n");
            let groupRadioButton = `
                <div class="form-check text-white mb-2" style="border: 1px solid #D0D5DD;margin: 2px 4px;min-height: 30px;border-radius: 6px; background: #D0D5DD;">
                    <label class="form-check-label ml-1 text-white">${a}</label>
                    <input class="form-check-input" type="checkbox" data-id="risk-group-${a}" name="risk-group" />
                </div>
                <div class="risk-group-child" id="risk-group-${a}">${riskGroupOptions}</div>
            `;
            return groupRadioButton;
        }).join("\n");


        // Single child select from criteria
        let optionsToFill = {
            "risk": riskOptions, 
            "hazard": hazardOptions
        };
        this.accordionChild.empty().html(optionsToFill[this.criteria]);

        setTimeout(() => {
            $(`input[type="checkbox"][name="option-${this.criteria}"]`).on("change", e => {
                this.comparePanel.empty();
                let checkedItems = $(`input[type="checkbox"][name="option-${this.criteria}"]`)
                        .filter(":checked") // Only checked checkboxes
                        .map((_, checkbox) => $(checkbox).val())
                        .get();
                this.selectedVectorIndex = checkedItems.length
                    ? this.vectorIndex.filter(b => checkedItems.includes(b.type))
                    : [];
                this.refreshComparePane();

                if(this.criteria == "risk"){
                    $("input[type='checkbox'][name^='option-']").on("change", function () {
                        let groupId = $(e.currentTarget).data("group-id");
                        let groupCheckbox = $(`input[type='checkbox'][data-id='${groupId}']`);
                        $(`input[type='checkbox'][data-group-id='${groupId}']:checked`).length 
                            === $(`input[type='checkbox'][data-group-id='${groupId}']`).length
                            ? groupCheckbox.prop("checked", true)
                            : groupCheckbox.prop("checked", false);

                    });
                }
            })

            if(this.criteria == "risk"){
                $("input[type='checkbox'][name='risk-group']").on("change", e => {
                    let groupId = $(e.currentTarget).data("id");
                    let checkboxes = $(`input[type='checkbox'][data-group-id='${groupId}']`);
                    $(e.currentTarget).prop("checked")
                        ? checkboxes.prop("checked", true).trigger("change")
                        : checkboxes.prop("checked", false).trigger("change"); 
                });
            }
        }, 100);
    }


    refreshComparePane = () => {
        let paneHtml = this.selectedVectorIndex.map(a => {
            let cardTitle = a.folder == "risk" ? `${a.group} - ${a.name}` : a.name;
            return `<div class="col-sm-12 col-md-4 col-lg-4">
                <div class="card border-1 card_campare">
                    <div class="card-header bg-white border-0">
                        <div class="d-flex justify-content-between align-items-center">
                            <div><h5 class="card-title-text mb-0">${cardTitle}</h5></div>
                        </div>
                    </div>
                    <div class="card-body p-2 pt-0" style="width: 100%; height: 50vh;" id="map-pane-${a.type}">
                        <div style="top: 10px; right: 10px; position: absolute; z-index: 1000;" id="map-legend-${a.type}"></div>
                    </div>
                </div>
            </div>`;
        }).join("\n");
        this.comparePanel.empty().html(paneHtml);

        setTimeout(() => {
            this.selectedVectorIndex.forEach(layerDetails => {
                let mapContainerObj = L.map(`map-pane-${layerDetails.type}`, {fullscreenControl: true, zoomControl: true, attributionControl: false});
                let tileLayer = L.tileLayer(this.backgroundTilesLayer, {attribution: null});
                tileLayer.addTo(mapContainerObj);
                mapContainerObj.setView(this.centerCoordinates, 5.5);
                mapContainerObj.touchZoom.disable();
                mapContainerObj.doubleClickZoom.disable();
                mapContainerObj.scrollWheelZoom.disable();
                mapContainerObj.boxZoom.disable();
                this.readData(layerDetails, mapContainerObj, $(`div#map-legend-${layerDetails.type}`));
                mapContainerObj.on('fullscreenchange', function () {
                    mapContainerObj.isFullscreen()
                        ? mapContainerObj.setZoom(mapContainerObj.getZoom() + 1)
                        : mapContainerObj.setZoom(mapContainerObj.getZoom() - 1);
                });
            });
        }, 0);
    }

    readData = (layerDetails, mapContainerObj, mapLegendObj) => {
        this.loadMapFile(`${layerDetails.folder}/${layerDetails.file}`)
        .then(topoResponse => {
            let geoData = topojson.feature(topoResponse, topoResponse.objects.collection);
            this.drawPolygons(geoData, layerDetails, mapContainerObj, mapLegendObj);
        })
        .catch(err => {
            this.pageAlert(`Unable to get ${layerDetails.name} layer`, 0);
            console.error(err);
        })
        .finally(() => this.stopWaiting());
    }

    drawPolygons = (geoData, layerDetails, mapContainerObj, mapLegendObj) => {
        let polygonFillIndex = layerDetails.needLegend
            ? this.polygonFillIndex.filter(b => b.folder == layerDetails.folder && b.type == layerDetails.type)
            : [];
        if(polygonFillIndex.length) this.displayPolygonLegend(mapLegendObj, polygonFillIndex);
        let tooltip;
        let polygons = L.d3SvgOverlay((selection, projection) => {
            let pScale = projection.scale;
            let locationGroup = selection.selectAll("path").data(geoData.features);
            locationGroup.enter()
                .append("path")
                .attr("d", d => projection.pathFromGeojson(d))
                .attr("id", (d, i) => `${layerDetails.type}_${i}`)
                .attr("style", "z-index:2000;pointer-events:visiblePainted !important;")
                .attr("fill", d => this.getColorByPolygonValue(d.properties[layerDetails.label1], polygonFillIndex, layerDetails.nonNumericLegend))
                .attr("fill-opacity", 4/5)
                .attr("stroke", layerDetails.stroke)
                .attr("stroke-width", "0.5px")
                .on("mouseenter", (e, d, i) => {
                    d3.select(`${layerDetails.type}_${i}`).attr("cursor", "pointer");
                    let mainVal = !isNaN(d.properties[layerDetails.label1]) 
                        ? this.formatFloat(d.properties[layerDetails.label1])
                        : d.properties[layerDetails.label1]
                    let tooltipValue = d.properties[layerDetails.label2] 
                        ? [mainVal, d.properties[layerDetails.label2]].join(" | ")
                        : mainVal;
                    let tooltipContent = `${layerDetails.name}: ${tooltipValue}` || this.country;
                    tooltip = projection.layer.bindTooltip(tooltipContent).openTooltip(
                        L.latLng(projection.layerPointToLatLng(projection.pathFromGeojson.centroid(d)))
                    );
                })
                .on("mouseleave", (e, d) => tooltip?.closeTooltip())
            locationGroup.transition().duration(10).attr("stroke-width", `${0.5/pScale}px`);
        });
        polygons.addTo(mapContainerObj);

    }

    displayPolygonLegend = (mapLegendObj, polygonFillIndex) => {
        let legendHtml = polygonFillIndex.map(a => {
            return `<div style="display: flex; align-items: center;">
                <div style="background-color: ${a.color}; height: 15px; width: 15px;"></div>
                <div class="text-dark" style="margin-left: 5px;">&nbsp;${a.label}</div>
            </div>`;
        }).join("\n");
        mapLegendObj.empty().html(legendHtml);
    }

    getColorByPolygonValue = (value, polygonFillIndex, isNonNumericLegend) => {
        return isNonNumericLegend
            ? polygonFillIndex.find(b => b.discrete == value)?.color || "transparent"
            : polygonFillIndex.find(b => b.min <= value && b.max >= value)?.color || "transparent";
    }


    enableScreenshot = () => {
		this.captureButton.on('click', () => {
			this.startWaiting();
			const container = document.querySelector('div#comparison-map-panel');
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
        });
    }

    loadExcelFile = (fileName) => new Promise((resolve, reject) => {
        this.startWaiting();
        fetch(`./assets/vector_maps/senegal/${fileName}`).then(res => res.blob()).then(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const bstr= e.target.result;
                resolve(bstr)
            }
            reader.readAsBinaryString(file);
        }).catch(err => reject(err))
    });

    excelToArray = (file, ...sheets) => {
        let wb = XLSX.read(file, {type: 'binary'});
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
                "success": response => typeof(response) == "string" ? resolve(JSON.parse(response)) : resolve(response),
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
    formatFloat = (num) => Number.isInteger(num) ? num : num.toFixed(2);

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

class ZambiaGeoCompare{
    constructor(criteria){
        this.criteria = criteria;
        this.apiUrl = apiUrl;
        this.countryId = 2;
        this.country = "Zambia";
        this.mapsFolder = "zambia";
        this.centerCoordinates = [-13.1339, 27.8493];
        this.vectorIndex = [];
        this.polygonFillIndex = [];
        this.resourceLayerIndex = [];
        this.backButton = $("a#back-button")

        // option holders
        this.criteriaAccordionIndex = {
            "risk": {"title": " Risk Indicator", "image": "risk-indicator.svg"},
            "hazard": {"title": " Hazard", "image": "hazard1.svg"},
        };
        this.criteriaAccordion = `<div class="accordion-item bg-transparent border-0">
            <h2 class="accordion-header" id="heading-${this.criteria}-compare">
                <button class="accordion-button bg-btn" type="button"
                    data-bs-toggle="collapse" data-bs-target="#collapse-${this.criteria}-compare" aria-expanded="true"
                    aria-controls="collapse-${this.criteria}-compare">
                    <img src="./assets/images/${this.criteriaAccordionIndex[this.criteria].image}">
                    <span class="pl-1">${this.criteriaAccordionIndex[this.criteria].title}</span>
                </button>
            </h2>
            <div id="collapse-${this.criteria}-compare" class="accordion-collapse "
                aria-labelledby="heading-${this.criteria}-compare" data-bs-parent="#heading-${this.criteria}-compare">
                <div class="accordion-body">
                    <div class="row">
                        <div class="col-sm-12 col-md-12 col-lg-12">
                            <div class="form-group my-3" id="options-${this.criteria}-compare"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        this.accordionParent = $("div#comparison-layer-accordion");
        this.selectedVectorIndex = [];
        this.captureButton = $("button#capture-btn");

        // map container panel
        this.comparePanel = $("div#comparison-map-panel");
        this.backgroundTilesLayer = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png";

        // cookies
        this.cookieObject = getCookies(document.cookie);
        this.jwt = this.cookieObject.jwt;
        this.userEmail = this.cookieObject.userEmail;
        this.isLoggedIn = this.cookieObject.isLoggedIn;
        this.authHeader = {"Authorization": this.jwt};
        this.logoutLink = $("a#link-logout");
        this.userMgmtLink = $("li#user-management-link");
        this.loggedInUserEmailLabel = $("li#user-email-label");
        
    }

    onLogoutClick = () => {
        document.cookie = `userEmail=null`;
        document.cookie = `jwt=null`;
        document.cookie = `isLoggedIn=false`;
        document.cookie = `userRoleId=null`;
        this.pageAlert("Logged out successfully", 0);
        setTimeout(() => window.location.replace("index.html"), 1000);
    }

    init = () => {
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.backButton.on("click",() =>  window.close())
        this.logoutLink.on("click", this.onLogoutClick);
        this.loadData();
    }

    loadData = () => {
        Promise.allSettled([
            this.loadExcelFile("zambia_layer_index.xlsx")
        ])
        .then(responses => {
            responses.forEach((response, i) => {
                switch(true){
                    case i == 0: // Country's layer index
                        if (response.status == "fulfilled") 
                            [this.vectorIndex, this.polygonFillIndex, this.resourceLayerIndex]
                                = this.excelToArray(response.value, "vectorIndex", "polygonFillIndex", "resourceLayerIndex");
                        else this.pageAlert("Issue in loading Sri Lanka's layer index sheet", 0);
                        break;
                    default:
                        break;
                }
            })
        })
        .then(() => {
            this.accordionParent.empty().html(this.criteriaAccordion);
            this.accordionChild = $(`div#options-${this.criteria}-compare`);
        })
        .then(this.fillLayerOptions)
        .then(() => {
            let initialLayersOnLoad = Array.from($(`input[type="checkbox"][name="option-${this.criteria}"][data-init-load="1"]`));
            initialLayersOnLoad.forEach(a => setTimeout(() => $(a).prop("checked", true).trigger("change"), 100));
        })
        .then(this.enableScreenshot)
        .catch(err => {
            console.error(err);
            this.pageAlert("Issue in loading initial data, please contact dev team", 0);
        })
        .finally(this.stopWaiting);
    }

    fillLayerOptions = () => {
        // 1. Hazard - Filled Polygon
        let hazardDetails = this.vectorIndex.filter(a => a.folder == "hazard" && a.status);
        let hazardOptions = hazardDetails.map(a => {
            return `<div class="form-check">
                <input class="form-check-input" type="checkbox" name="option-${a.folder}" value="${a.type}" data-init-load="${a.compareInitLoad}">
                <label class="form-check-labels ms-2 text-white pl-1">${a.name}</label>
            </div>`;
        }).join("\n");

        // 2. Risk Indicator - Filled Polygon
        let riskDetails = this.vectorIndex.filter(a => a.folder == "risk" && a.status);
        let riskOptions = riskDetails.map(b => {
            return `<div class="form-check ml-3">
                <input class="form-check-input" type="checkbox" name="option-risk" value="${b.type}" data-init-load="${b.compareInitLoad}">
                <label class="form-check-label ms-2 text-white pl-1">${b.name}</label>
            </div>`;
        }).join("\n");

        // Single child select from criteria
        let optionsToFill = {
            "risk": riskOptions, 
            "hazard": hazardOptions
        };
        this.accordionChild.empty().html(optionsToFill[this.criteria]);

        setTimeout(() => {
            $(`input[type="checkbox"][name="option-${this.criteria}"]`).on("change", e => {
                this.comparePanel.empty();
                let checkedItems = $(`input[type="checkbox"][name="option-${this.criteria}"]`)
                        .filter(":checked") // Only checked checkboxes
                        .map((_, checkbox) => $(checkbox).val())
                        .get();
                this.selectedVectorIndex = checkedItems.length
                    ? this.vectorIndex.filter(b => checkedItems.includes(b.type))
                    : [];
                this.refreshComparePane();
            });
        }, 100);

    }


    refreshComparePane = () => {
        let paneHtml = this.selectedVectorIndex.map(a => {
            let cardTitle = a.folder == "risk" ? `${a.name}` : a.name;
            return `<div class="col-sm-12 col-md-4 col-lg-4">
                <div class="card border-1 card_campare">
                    <div class="card-header bg-white border-0">
                        <div class="d-flex justify-content-between align-items-center">
                            <div><h5 class="card-title-text mb-0">${cardTitle}</h5></div>
                        </div>
                    </div>
                    <div class="card-body p-2 pt-0" style="width: 100%; height: 50vh;" id="map-pane-${a.type}">
                        <div style="top: 10px; right: 10px; position: absolute; z-index: 1000;" id="map-legend-${a.type}"></div>
                    </div>
                </div>
            </div>`;
        }).join("\n");
        this.comparePanel.empty().html(paneHtml);

        setTimeout(() => {
            this.selectedVectorIndex.forEach(layerDetails => {
                let mapContainerObj = L.map(`map-pane-${layerDetails.type}`, {fullscreenControl: true, zoomControl: true, attributionControl: false});
                let tileLayer = L.tileLayer(this.backgroundTilesLayer, {attribution: null});
                tileLayer.addTo(mapContainerObj);
                mapContainerObj.setView(this.centerCoordinates, 5.25);
                mapContainerObj.touchZoom.disable();
                mapContainerObj.doubleClickZoom.disable();
                mapContainerObj.scrollWheelZoom.disable();
                mapContainerObj.boxZoom.disable();
                this.readData(layerDetails, mapContainerObj, $(`div#map-legend-${layerDetails.type}`));
                mapContainerObj.on('fullscreenchange', function () {
                    mapContainerObj.isFullscreen()
                        ? mapContainerObj.setZoom(mapContainerObj.getZoom() + 1)
                        : mapContainerObj.setZoom(mapContainerObj.getZoom() - 1);
                });
            });
        }, 0);
    }

    readData = (layerDetails, mapContainerObj, mapLegendObj) => {
        this.loadMapFile(`${layerDetails.folder}/${layerDetails.file}`)
        .then(topoResponse => {
            let geoData = topojson.feature(topoResponse, topoResponse.objects.collection);
            this.drawPolygons(geoData, layerDetails, mapContainerObj, mapLegendObj);
        })
        .catch(err => {
            this.pageAlert(`Unable to get ${layerDetails.name} layer`, 0);
            console.error(err);
        })
        .finally(() => this.stopWaiting());
    }

    drawPolygons = (geoData, layerDetails, mapContainerObj, mapLegendObj) => {
        let polygonFillIndex = layerDetails.needLegend
            ? layerDetails.variableLegend
                ? this.variableColorRange(
                    this.polygonFillIndex.filter(b => b.folder == layerDetails.folder && b.type == layerDetails.type),
                    geoData.features.map(b => b.properties),
                    layerDetails.label1
                )
                : this.polygonFillIndex.filter(b => b.folder == layerDetails.folder && b.type == layerDetails.type)
            : [];
        if(polygonFillIndex.length) this.displayPolygonLegend(mapLegendObj, polygonFillIndex);
        let tooltip;
        let polygons = L.d3SvgOverlay((selection, projection) => {
            let pScale = projection.scale;
            let locationGroup = selection.selectAll("path").data(geoData.features);
            locationGroup.enter()
                .append("path")
                .attr("d", d => projection.pathFromGeojson(d))
                .attr("id", (d, i) => `${layerDetails.type}_${i}`)
                .attr("style", "z-index:2000;pointer-events:visiblePainted !important;")
                .attr("fill", d => this.getColorByPolygonValue(d.properties[layerDetails.label1], polygonFillIndex, layerDetails.nonNumericLegend))
                .attr("fill-opacity", 4/5)
                .attr("stroke", layerDetails.stroke)
                .attr("stroke-width", "0.5px")
                .on("mouseenter", (e, d, i) => {
                    d3.select(`${layerDetails.type}_${i}`).attr("cursor", "pointer");
                    let mainVal = !isNaN(d.properties[layerDetails.label1]) 
                        ? this.formatFloat(d.properties[layerDetails.label1])
                        : d.properties[layerDetails.label1]
                    let tooltipValue = d.properties[layerDetails.label2] 
                        ? [mainVal, d.properties[layerDetails.label2]].join(" | ")
                        : mainVal;
                    let tooltipContent = `${layerDetails.name}: ${tooltipValue}` || this.country;
                    tooltip = projection.layer.bindTooltip(tooltipContent).openTooltip(
                        L.latLng(projection.layerPointToLatLng(projection.pathFromGeojson.centroid(d)))
                    );
                })
                .on("mouseleave", (e, d) => tooltip?.closeTooltip())
            locationGroup.transition().duration(10).attr("stroke-width", `${0.5/pScale}px`);
        });
        polygons.addTo(mapContainerObj);

    }

    displayPolygonLegend = (mapLegendObj, polygonFillIndex) => {
        let legendHtml = polygonFillIndex.map(a => {
            return `<div style="display: flex; align-items: center;">
                <div style="background-color: ${a.color}; height: 15px; width: 15px;"></div>
                <div class="text-dark" style="margin-left: 5px;">&nbsp;${a.label}</div>
            </div>`;
        }).join("\n");
        mapLegendObj.empty().html(legendHtml);
    }

    getColorByPolygonValue = (value, polygonFillIndex, isNonNumericLegend) => {
        return isNonNumericLegend
            ? polygonFillIndex.find(b => b.discrete == value)?.color || "transparent"
            : polygonFillIndex.find(b => b.min <= value && b.max >= value)?.color || "transparent";
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



    enableScreenshot = () => {
		this.captureButton.on('click', () => {
			this.startWaiting();
			const container = document.querySelector('div#comparison-map-panel');
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
        });
    }

    loadExcelFile = (fileName) => new Promise((resolve, reject) => {
        this.startWaiting();
        fetch(`./assets/vector_maps/zambia/${fileName}`).then(res => res.blob()).then(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const bstr= e.target.result;
                resolve(bstr)
            }
            reader.readAsBinaryString(file);
        }).catch(err => reject(err))
    });

    excelToArray = (file, ...sheets) => {
        let wb = XLSX.read(file, {type: 'binary'});
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
                "success": response => typeof(response) == "string" ? resolve(JSON.parse(response)) : resolve(response),
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
    formatFloat = (num) => Number.isInteger(num) ? num : num.toFixed(2);
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