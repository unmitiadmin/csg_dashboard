$(window).on("load", () => {
    let ccsFormAdd = new CCSFormAdd();
    ccsFormAdd.init();
});


class CCSFormAdd {
    constructor(){
        // api url
        this.apiUrl = apiUrl;
        // cookies and user details
        this.cookieObject = getCookies(document.cookie);
        this.jwt = this.cookieObject.jwt;
        this.userEmail = this.cookieObject.userEmail;
        this.isLoggedIn = this.cookieObject.isLoggedIn;
        this.userRoleId = this.cookieObject.userRoleId;
        this.initialCountryId = 4;
        this.authHeader = { "Authorization": this.jwt };
        this.logoutLink = $("a#link-logout");
        this.userMgmtLink = $("li#user-management-link");
        this.loggedInUserEmailLabel = $("li#user-email-label");
        this.userCountryIcon = $("img#user-country-icon");
        // Form specific DOM constants
        this.formId = 1;
        this.formTabs = $("ul.ccs-tabs#formTabs");
        this.formTabsContent = $("div.tab-content#formTabsContent");
        this.formFieldData = [];
        this.fieldOptionsData = [];
        this.tabsCount = 0;
        this.lkpProject = [];
        // Navigation buttons
        this.btnPrevious = $("button#btn-previous-ccs");
        this.btnSaveDraft = $("button#btn-savedraft-ccs");
        this.btnNext = $("button#btn-next-ccs");
        this.btnSubmit = $("button#btn-submit-ccs");
        // Lookup index
        this.lookupsReqBody = {
            "tables": [
                "country",
                "province",
                "district",
            ]
        }; // Initially fill these, for lower levels call APIs by their parent location IDs
        this.lkpCountryData = [
            {"value": 5, "label": "Kenya"},
            {"value": 7, "label": "Senegal"},
            {"value": 4, "label": "Sri Lanka"},
            {"value": 2, "label": "Zambia"},
        ];
        // Location Lookup Options
        this.lkpProvinceData = [];
        this.lkpDistrictData = [];
        this.lkpDSData = [];
        this.lkpASCData = [];
        this.lkpARPAData = [];
        this.lkpGNData = [];
        this.locationLookups = {
            "lkp_country": this.lkpCountryData, // country
            "lkp_state": this.lkpProvinceData, // Province
            "lkp_district": this.lkpDistrictData, //District
            "lkp_ds": this.lkpDSData, // DS
            "lkp_tehsil": this.lkpASCData, // ASC
            "lkp_block": this.lkpARPAData, // ARPA
            "lkp_grampanchayat": this.lkpGNData, // GN
        };
        // SDG Lookup Options
        this.lkpSdgGoalData = [];
        this.lkpSdgTargetData = [];
        this.sdgLookups = {
            "lkp_sdg_goals": this.lkpSdgGoalData,
            "lkp_sdg_indicators": this.lkpSdgTargetData,
        };
        // Other Lookup Options
        this.ccsLkpReqBody = {
            "tables": ["outcomes", "outputs"]
        }
        this.lkpOutcomeData = [];
        this.lkpOutputData = [];
        this.ccsLookups = {
            "lkp_project_outcomes": this.lkpOutcomeData,
            "lkp_project_outputs": this.lkpOutputData,
        };
        // selectpicker common options
        this.spOptions = {
            actionsBox: true,
            liveSearch: true,
            selectedTextFormat: "count > 3",
            size: 5,
        };
        // datepicker common options
        this.monthYearOptions = {
            format: "mm/yyyy",
            startView: "months", 
            minViewMode: "months",
            autoclose: true,
            clearBtn: true,
        };
        // collective indexes
        this.tabIdList = [];
        this.groupIdList = [];
        // minimum required fields 
        this.reqFieldIds = [504, 511] // Project title, Province Id
    }

    init = () => {
        if(this.isLoggedIn){
            this.execute();
            // do auth/self and then execute in later stages
        } else {
            this.pageAlert("Please login", 0);
            window.location.replace("ccs.html");
        }
    }

    execute = () => {
        Promise.all([
            this.getApi(this.authHeader, `ccs/form_fields?form_id=${this.formId}`),
            this.getApi(this.authHeader, `ccs/field_options?form_id=${this.formId}`),
            this.postApi(this.lookupsReqBody, this.authHeader, "projects/lookups"),
            this.getApi(this.authHeader, `ndc/sdg`),
            this.getApi(this.authHeader, `ndc/sdg_target`),
            this.postApi(this.ccsLkpReqBody, this.authHeader, "ccs/lookups"),
        ])
        .then(response => {
            let [
                formFieldsResponse, 
                fieldOptionsResponse, 
                lkpResponse,
                lkpSdgGoalResponse,
                lkpSdgTargetResponse,
                lkpCCSResponse,
            ] = response;
            this.formFieldData = formFieldsResponse.data;
            this.fieldOptionsData = fieldOptionsResponse.data;
            // LOCATION LOOKUPS
            // Ignore country filter here temporarily -- its only for Sri Lanka (country_id=4)
            this.lkpProvinceData = lkpResponse.data
                .find(b => b.table == "province").lookup_data
                // .filter(b => b.country_id == 4)
                .map(b => {return {"value": b.province_id, "label": b.province, "country_id": b.country_id};});
            this.lkpDistrictData = lkpResponse.data
                .find(b => b.table == "district").lookup_data
                // .filter(b => b.country_id == 4)
                .map(b => {return {"value": b.district_id, "label": b.district, "province_id": b.province_id};});
            // SDG LOOKUPS
            this.lkpSdgGoalData = lkpSdgGoalResponse.data.map(b => {
                 return {"value": b.id, "label": b.goal};
            });
            this.lkpSdgTargetData = lkpSdgTargetResponse.data.map(b => {
                return {"value": b.id, "label": b.target, "goal_id": b.sdg_id}
            });
            // OTHER LOOKUPS
            this.lkpOutcomeData = lkpCCSResponse.data
                .find(b => b.table == "outcomes").lookup_data
                .map(b => {return {"value": b.outcome_id, "label": b.outcome}});
            this.lkpOutputData = lkpCCSResponse.data
                .find(b => b.table == "outputs").lookup_data
                .map(b => {return {"value": b.output_id, "label": b.output, "outcome_id": b.outcome_id}});
        })
        .then(this.loadContent)
        .then(this.enableTabNavigation)
        .then(this.initializeGroupHandlers)
        .then(() => $("select").selectpicker(this.spOptions))
        .then(() => $("input[data-subtype='month_year']").datepicker(this.monthYearOptions))
        .then(() => {
            // initially load the countries, there after fill the below levels
            $(`select[data-type="lkp_country"]`).on("change", e => {
                let countryIdList = $(e.currentTarget).val().map(b => Number(b));
                this.fillUnderlyingLocations("lkp_state", countryIdList);
            });
        })
        .then(() => {
            // load both sdg goals and targets; based on selected goals, apply targets too 
            $(`select[data-type="lkp_sdg_goals"]`).on("change", e => {
                let goalIdsList = $(e.currentTarget).val().map(b => Number(b));
                let groupId = $(e.currentTarget).data("group-id");
                let groupIndex = $(e.currentTarget).data("group-index");
                let filteredTargets = this.lkpSdgTargetData.filter(b => goalIdsList.includes(b.goal_id)).map(b => b.value);
                $(`select[data-type="lkp_sdg_indicators"][data-group-id="${groupId}"][data-group-index="${groupIndex}"]`).selectpicker("val", filteredTargets);
                $(`select[data-type="lkp_sdg_indicators"][data-group-id="${groupId}"][data-group-index="${groupIndex}"]`).selectpicker("refresh");
            });
        })
        .then(() => {
            $("input[type='radio'][data-has-dependents='true']").on("click", e => {
                let currentTarget = $(e.currentTarget)
                let fieldId = currentTarget.attr("data-field-id");
                let checkedValue = currentTarget.val();
                $(`div.row[data-parent-id="${fieldId}"]`).each((_, element) => {
                    let childToggleValue = $(element).attr("data-child-toggle-value");
                    childToggleValue === checkedValue  ? $(element).show() : $(element).hide(); 
                });
            });
        })
        .catch(err => {
            console.error(err);
            this.pageAlert("Unable to build CCS form", 0)
        })
        .finally(this.stopWaiting);
    }

    loadContent = () => {
        let tabs = this.formFieldData.filter(a => a.type == "tab" && a.is_tab && !a.is_group);
        this.tabsCount = tabs.length;
        this.tabFieldIds = tabs.map(a => Number(a.field_id));
        this.tabIdList = tabs.map(a => a.field_id);
        this.groupIdList = this.uqArray(this.formFieldData.filter(a => a.group_id).map(a => a.group_id));
        // Left Hand Side tabs
        let tabsHtml =  tabs.map((a, i) => {
            let initialActive = i == 0 ? "active" : "";
            return `<li class="nav-item">
                <a class="nav-link ${initialActive} form-tabs" id="tab-${a.field_id}" 
                    data-tab-id="${a.field_id}" data-tab-index="${i}"
                    data-toggle="tab" href="#ccs${a.field_id}" role="tab">
                    <div class="d-flex justify-content-between align-items-center">
                    <div>  ${a.label} </div>
                    <div style="border-radius: 100px;background: #fff;"> <img class="p-1" width="22px" src="assets/images/arrow-right.png" alt="aroow right"></div>
                  </div>
                </a>
            </li>`;
        }).join("\n");
        this.formTabs.empty().html(tabsHtml);
        // Right Hand Side Tab contents 
        let tabContentHtml = tabs.map((a, i) => {
            let tabFields = this.formFieldData.filter(b => b.type != "tab" && b.tab_id == a.field_id);
            let initialActive = i == 0 ? "active" : "";
            let tabFieldContent = this.prepareTabFields(tabFields, a.field_id);
            return `<div class="tab-pane fade show ${initialActive}" id="ccs${a.field_id}" data-tab-index="${i}" role="tabpanel">
                ${tabFieldContent}
            </div>`;
        }).join("\n");
        this.formTabsContent.empty().html(tabContentHtml);
    }

    prepareTabFields = (tabFieldContent, formTabId) => {
        // iterate the content and fill it inside the formTabContainer
        let formFieldItems = tabFieldContent.map((a, i) => {
            let spanDescription = a.description? `<span>${a.description}</span>`: "";
            if(a.type == "header"){
                return `<div class="row">
                    <div class="col-sm-12 col-md-5 col-lg-4">
                        <div class="form-group">
                            <label>${a.label}</label><br>
                        </div>
                    </div>
                </div>`;
            } else{
                let fieldElement = this.chooseFormElement(a, null);
                let initialHide = a.initial_hide ? ` style="display:none;"` : "";
                let parentId = a.parent_id ? ` data-parent-id="${a.parent_id}"` : "";
                let childToggleValue = a.child_toggle_value ? ` data-child-toggle-value="${a.child_toggle_value}"` : "";
                if(a.is_group_child || a.type == "group"){
                    // if its group, then keep the ids separate along with add-more button
                    if(a.type == "group") return this.placeGroup(a);
                } else{
                    return `<div class="row" data-field-row="${a.field_id}" data-tab-id="${a.tab_id}"
                                ${parentId} ${initialHide} ${childToggleValue}>
                        <div class="col-sm-12 col-md-5 col-lg-4">
                            <div class="form-group">
                                <label>${a.label}</label><br>
                                ${spanDescription}
                            </div>
                        </div>
                        <div class="col-sm-12 col-md-1 col-lg-2"></div>
                        <div class="col-sm-12 col-md-6 col-lg-6">
                            ${fieldElement}
                        </div>
                    </div>`;
                }
            }
        }).join("\n");
        let formTabContainer = `<div class="row">
            <div class="col-sm-12 col-md-12 col-lg-12">
                <form id="form${formTabId}">
                    <div class="card ccs-card border-0">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-sm-12 col-md-12 col-lg-12">
                                    ${formFieldItems}
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>`;
        return formTabContainer;
    }

    enableTabNavigation = () => {
        $("a.form-tabs.nav-link").on("click", e => {
            let currentTarget = $(e.currentTarget);
            let tabIndex = Number(currentTarget.data("tab-index"));
            this.btnSaveDraft.attr("data-tab-id", this.tabIdList[tabIndex]);
            switch(true){
                case tabIndex == 0:
                    this.btnPrevious
                        .attr("disabled", true)
                        .hide();
                    this.btnNext
                        .attr("disabled", false)
                        .unbind("click")
                        .on("click", () => $(`a.form-tabs.nav-link[data-tab-index='${tabIndex + 1}']`).trigger("click"))
                        .show();
                    this.btnSubmit
                        .attr("disabled", true)
                        .hide();
                    break;
                case tabIndex >= 1 && tabIndex < this.tabsCount - 1:
                    this.btnPrevious
                        .attr("disabled", false)
                        .unbind("click")
                        .on("click", () => $(`a.form-tabs.nav-link[data-tab-index='${tabIndex - 1}']`).trigger("click"))
                        .show();
                    this.btnNext
                        .attr("disabled", false)
                        .unbind("click")
                        .on("click", () => $(`a.form-tabs.nav-link[data-tab-index='${tabIndex + 1}']`).trigger("click"))
                        .show();
                    this.btnSubmit
                        .attr("disabled", true)
                        .hide();
                    break;
                case tabIndex == this.tabsCount - 1:
                    this.btnPrevious
                        .attr("disabled", false)
                        .unbind("click")
                        .on("click", () => $(`a.form-tabs.nav-link[data-tab-index='${tabIndex - 1}']`).trigger("click"))
                        .show();
                    this.btnNext
                        .attr("disabled", false)
                        .hide();
                    this.btnSubmit
                        .attr("disabled", false)
                        .unbind("click")
                        .on("click", this.handleFormData)
                        .show();
                    break;
                default: 
                    break;
            }
        });
        $("a.form-tabs.nav-link[data-tab-index='0']").trigger("click");
    }

    collectFormData() {
        let formData = new FormData();
        let formDataObj = {};
        // Ungrouped data
        $("[data-field-id]:not([data-group-id])").each((_, e) => {
            let element = $(e);
            let fieldId = element.data("field-id");
            if (fieldId === undefined || fieldId === null) return;
            let fieldKey = `field_${fieldId}`;
            if (element.is(`input[type="file"]`)) {
                if (element[0].files.length > 0) {
                    let file = element[0].files[0];
                    formData.append(fieldKey, file);
                    formDataObj[fieldKey] = file.name;
                } else {
                    formData.append(fieldKey, null);
                    formDataObj[fieldKey] = null;
                }
            } else if (element.is(`input[type="radio"]`) || element.is(`input[type="checkbox"]`)) {
                if (element.is(":checked")) {
                    formData.append(fieldKey, element.val());
                    formDataObj[fieldKey] = element.val();
                } else if (!formDataObj[fieldKey]) {
                    formData.append(fieldKey, null);
                    formDataObj[fieldKey] = null;
                }
            } else if (element.is("select[multiple]")) {
                let selectedOptions = element.val() || null;
                formData.append(fieldKey, JSON.stringify(selectedOptions));  
                formDataObj[fieldKey] = selectedOptions;
            } else {
                let value = element.val() ? element.val() : null;
                formData.append(fieldKey, value);
                formDataObj[fieldKey] = value;
            }
        });
        // Grouped data
        let groupedData = {};
        this.groupIdList.forEach(groupId => {
            groupedData[groupId] = [];
            let groupData = {};
            // Collect data for each group index
            $(`[data-group-id=${groupId}]`).each((_, e) => {
                let element = $(e);
                let groupIndex = element.data("group-index");
                let fieldId = element.data("field-id");
                if (fieldId === undefined || fieldId === null) return;
                let fieldKey = `field_${fieldId}`;
                // Ensure the group index object exists as an array item
                if (!groupData[groupIndex]) groupData[groupIndex] = {};
                // Handle non-file inputs (radios, checkboxes, text inputs)
                if (element.is(`input[type="radio"]`) || element.is(`input[type="checkbox"]`)) {
                    if (element.is(":checked")) {
                        groupData[groupIndex][fieldKey] = element.val();
                    } else if (!groupData[groupIndex][fieldKey]) {
                        groupData[groupIndex][fieldKey] = null;
                    }
                } else {
                    let value = element.val() ? element.val() : null;
                    groupData[groupIndex][fieldKey] = value;
                }
            });
            // Push the collected groupData array to groupedData[groupId]
            groupedData[groupId] = Object.keys(groupData).map(groupIndex => groupData[groupIndex]);
        });
        formData.append('groupedData', JSON.stringify(groupedData));
        formDataObj.groupedData = groupedData;
        return { formData, formDataObj };
    }

    handleFormData = () => {
        let { formData, formDataObj } = this.collectFormData();
        let requiredFieldsFilled = this.reqFieldIds.map(fieldId => {
                if(Array.isArray(formDataObj[`field_${fieldId}`])){
                    return formDataObj[`field_${fieldId}`].length;
                } else return formDataObj[`field_${fieldId}`];
            }).every(Boolean);
        if(requiredFieldsFilled){
            this.postWithFile(this.authHeader, formData, "ccs/submit")
            .then(response => {
                this.pageAlert(response.message, 1);
                setTimeout(() => window.location.replace("ccs.html"), 2500);
            })
            .catch(err => {
                console.error(err);
                let errMsg = err?.responseJSON?.message || ""
                this.pageAlert(`Unable to submit details\n${errMsg}`, 0);
            })
            .finally(this.stopWaiting);
        } else this.pageAlert("Please enter the title and select a province", 0);
    }

    chooseFormElement = (a, groupIndex) => {
        switch(true){
            case Object.keys(this.locationLookups).includes(a.type):
                return this.placeLocationSelect(a, groupIndex);
            case Object.keys(this.sdgLookups).includes(a.type):
                return this.placeSDGSelect(a, groupIndex);
            case Object.keys(this.ccsLookups).includes(a.type):
                return this.placeCCSSelect(a, groupIndex);
            case a.type == "select": // Non lkp select box
                return this.placeSelect(a, groupIndex);
            case a.type == "text" && ["text", "email"].includes(a.subtype):
                return this.placeTextInput(a, groupIndex);
            case a.type == "text" && a.subtype == "month_year":
                return this.placeMonthYearInput(a, groupIndex);
            case a.type == "textarea":
                return this.placeTextArea(a, groupIndex);
            case a.type == "date":
                return this.placeDateInput(a, groupIndex);
            case a.type == "number":
                return this.placeNumberInput(a, groupIndex);
            case a.type == "radio-group":
                return this.placeRadioSet(a, groupIndex);
            case a.type == "file":
                return this.placeFileInput(a, groupIndex);
            case a.type == "group":
                return this.placeGroup(a);
            default:
                return "--INVALID INPUT ELEMENT--";
        }
    }

    placeLocationSelect = (a, groupIndex) => {
        let optionsHtml = ``;
        switch(true){
            case a.type == "lkp_country":
                optionsHtml = this.lkpCountryData.map(b => `<option value="${b.value}">${b.label}</option>`).join("\n");
                break;
            default: 
                break;
        };
        let dataGroupId = a.group_id ? ` data-group-id="${a.group_id}"` : "";
        let dataGroupIndex = ![null, undefined].includes(groupIndex) ? ` data-group-index="${groupIndex}"` : "";
        let dataSubType = a.subtype ? ` data-subtype="${a.subtype}"` : "";
        return `<select 
            class="mt-2"
            data-type="${a.type}"
            data-field-id="${a.field_id}"
            ${dataSubType}
            ${dataGroupId}
            ${dataGroupIndex}
            multiple
        >${optionsHtml}
        </select>`;
    };

    placeSDGSelect = (a, groupIndex) => {
        let optionsHtml = ``;
        switch(true){
            case a.type == "lkp_sdg_goals":
                optionsHtml = this.lkpSdgGoalData.map(b => `<option value="${b.value}">${b.label}</option>`).join("\n");
                break;
            case a.type == "lkp_sdg_indicators":
                optionsHtml = this.lkpSdgGoalData.map(b => {
                    let targets = this.lkpSdgTargetData.filter(c => c.goal_id == b.value);
                    let targetsHtml = targets.map(c => `<option value="${c.value}">${c.label}</option>`).join("\n");
                    return `<optgroup label="${b.value}. ${b.label}">${targetsHtml}</optgroup>`
                }).join("\n");
            default:
                break;
        };
        let dataGroupId = a.group_id ? ` data-group-id="${a.group_id}"` : "";
        let dataGroupIndex = ![null, undefined].includes(groupIndex) ? ` data-group-index="${groupIndex}"` : "";
        let dataSubType = a.subtype ? ` data-subtype="${a.subtype}"` : "";
        return `<select 
            class="mt-2"
            data-type="${a.type}"
            ${dataSubType}
            data-field-id="${a.field_id}"
            data-tab-id="${a.tab_id}"
            ${dataGroupId}
            ${dataGroupIndex}
            multiple
        >${optionsHtml}
        </select>`;
    }

    placeCCSSelect = (a, groupIndex) => {
        let optionsHtml = ``;
        switch(true){
            case a.type == "lkp_project_outcomes":
                optionsHtml = this.lkpOutcomeData.map(b => `<option value="${b.value}>${a.label}</option>`).join("\n");
                break;
            case a.type == "lkp_project_outputs":
                optionsHtml = this.lkpOutputData.map(b => `<option value="${b.value}>${a.label}</option>`).join("\n");
                break;
            default:
                break;
        };
        let dataGroupId = a.group_id ? ` data-group-id="${a.group_id}"` : "";
        let dataGroupIndex = ![null, undefined].includes(groupIndex) ? ` data-group-index="${groupIndex}"` : "";
        let dataSubType = a.subtype ? ` data-subtype="${a.subtype}"` : "";
        return `<select 
            class="mt-2"
            data-type="${a.type}"
            ${dataSubType}
            data-field-id="${a.field_id}"
            data-tab-id="${a.tab_id}"
            ${dataGroupId}
            ${dataGroupIndex}
            multiple
        >${optionsHtml}
        </select>`;
    }

    placeSelect = (a, groupIndex) => {
        let multipleProp = a.multiple ? "multiple" : "";
        let optionsList = this.fieldOptionsData.filter(b => b.field_id == a.field_id)
        let optionsListHtml = optionsList.map(b => `<option value="${b.value}">${b.label}</option>`).join("\n");
        let dataGroupId = a.group_id ? ` data-group-id="${a.group_id}"` : "";
        let dataGroupIndex = ![null, undefined].includes(groupIndex) ? ` data-group-index="${groupIndex}"` : "";
        let dataSubType = a.subtype ? ` data-subtype="${a.subtype}"` : "";
        return `<select 
                class="mt-2" 
                data-type="${a.type}"
                ${dataSubType}
                data-field-id="${a.field_id}"
                data-tab-id="${a.tab_id}"
                ${multipleProp}
                ${dataGroupId}
                ${dataGroupIndex}
            >
            ${optionsListHtml}
        </select>`;
    }

    placeTextInput = (a, groupIndex) => {
        let dataGroupId = a.group_id ? ` data-group-id="${a.group_id}"` : "";
        let dataGroupIndex = ![null, undefined].includes(groupIndex) ? ` data-group-index="${groupIndex}"` : "";
        let dataSubType = a.subtype ? ` data-subtype="${a.subtype}"` : "";
        return `<input 
            type="${a.type}" 
            class="form-control input-ccs mt-2"  
            data-type="${a.type}"
            ${dataSubType}
            data-field-id="${a.field_id}"
            data-tab-id="${a.tab_id}"
            ${dataGroupId}
            ${dataGroupIndex}
        />`;
    }

    placeMonthYearInput = (a, groupIndex) => {     
        let dataGroupId = a.group_id ? ` data-group-id="${a.group_id}"` : "";
        let dataGroupIndex = ![null, undefined].includes(groupIndex) ? ` data-group-index="${groupIndex}"` : "";
        let dataSubType = a.subtype ? ` data-subtype="${a.subtype}"` : "";
        return `<input 
            type="text" 
            class="form-control input-ccs mt-2"  
            data-type="${a.type}"
            ${dataSubType}
            data-field-id="${a.field_id}"
            data-tab-id="${a.tab_id}"
            ${dataGroupId}
            ${dataGroupIndex}
            onkeydown="return false;"
            onpaste="return false;"
        />`;
    }

    placeDateInput = (a, groupIndex) => {
        let dataGroupId = a.group_id ? ` data-group-id="${a.group_id}"` : "";
        let dataGroupIndex = ![null, undefined].includes(groupIndex) ? ` data-group-index="${groupIndex}"` : "";
        let dataSubType = a.subtype ? ` data-subtype="${a.subtype}"` : "";  
        return `<input 
            type="date" 
            class="form-control input-ccs mt-2"  
            data-type="${a.type}"
            ${dataSubType}
            data-field-id="${a.field_id}"
            data-tab-id="${a.tab_id}"
            ${dataGroupId}
            ${dataGroupIndex}
        />`;
    }

    placeTextArea = (a, groupIndex) => {
        let dataGroupId = a.group_id ? ` data-group-id="${a.group_id}"` : "";
        let dataGroupIndex = ![null, undefined].includes(groupIndex) ? ` data-group-index="${groupIndex}"` : ""; 
        let dataSubType = a.subtype ? ` data-subtype="${a.subtype}"` : "";  
        return `<textarea 
            class="form-control input-ccs mt-2"
            data-type="${a.type}"
            ${dataSubType}
            data-field-id="${a.field_id}"
            data-tab-id="${a.tab_id}"
            rows="4"
            ${dataGroupId}
            ${dataGroupIndex}
        ></textarea>`;
    }

    placeNumberInput = (a, groupIndex) => {
        let subtype = a.subtype == "phone" ? "phone" : "number";
        let dataGroupId = a.group_id ? ` data-group-id="${a.group_id}"` : "";
        let dataGroupIndex = ![null, undefined].includes(groupIndex) ? ` data-group-index="${groupIndex}"` : "";  
        let dataSubType = a.subtype ? ` data-subtype="${a.subtype}"` : "";
        return `<input 
            type="${subtype}" 
            class="form-control input-ccs mt-2"
            data-type="${a.type}"
            ${dataSubType}
            data-field-id="${a.field_id}"
            data-tab-id="${a.tab_id}"
            ${dataGroupId}
            ${dataGroupIndex}
        />`;
    }

    placeRadioSet = (a, groupIndex) => {
        let optionsList = this.fieldOptionsData.filter(b => b.field_id == a.field_id);
        let dataGroupId = a.group_id ? ` data-group-id="${a.group_id}"` : "";
        let dataGroupIndex = ![null, undefined].includes(groupIndex) ? ` data-group-index="${groupIndex}"` : "";
        let dataSubType = a.subtype ? ` data-subtype="${a.subtype}"` : "";
        let dataToggleValue = a.child_toggle_value ? ` data-toggle-value="${a.child_toggle_value}"`: "";

        let optionsListHtml = optionsList.map(b => {
            let nameAttr = dataGroupIndex ? `name="${b.field_id}_${a.group_id}_${groupIndex}"` : `name="${b.field_id}"`;
            return `<div class="mr-3 mt-2">
                <label>
                    <input 
                        type="radio" 
                        ${nameAttr}
                        value="${b.value}"
                        data-type="${a.type}"
                        ${dataSubType}
                        data-field-id="${a.field_id}"
                        data-tab-id="${a.tab_id}"
                        data-has-dependents="${a.has_dependents}"
                        ${dataToggleValue}
                        ${dataGroupId}
                        ${dataGroupIndex}
                    />
                    ${b.label}
                </label>
            </div>`;
        }).join("\n");
        return `<div class="d-flex justify-content-start">${optionsListHtml}</div>`;
    }

    placeFileInput = (a, groupIndex) => {
        let dataGroupId = a.group_id ? ` data-group-id="${a.group_id}"` : "";
        let dataGroupIndex = ![null, undefined].includes(groupIndex) ? ` data-group-index="${groupIndex}"` : "";
        let dataSubType = a.subtype ? ` data-subtype="${a.subtype}"` : "";
        return `<input 
            type="file"
            class="form-control input-ccs mt-2" 
            data-type="${a.type}"
            ${dataSubType}
            data-field-id="${a.field_id}"
            data-tab-id="${a.tab_id}"
            data-type="$:""
            ${dataGroupId}
            ${dataGroupIndex}
        />`;
    }

    placeGroup = (a) => {
        let groupChildren = this.formFieldData.filter(b => b.group_id == a.field_id);
        let groupChildrenHtml = groupChildren.map(b => {
            return `<div class="col-sm-3 col-md-3 col-lg-3">
                <div class="form-group">
                    <label><small><b>${b.label}</b></small></label>
                    ${this.chooseFormElement(b, 0)}
                </div>
            </div>`;
        }).join("\n");
        return `<div>
            <div class="form-group">
                <label>${a.label}</label>
            </div>
            <div class="row my-2 group-row" data-group-id="${a.field_id}" data-group-index="0">
                <div class="col-sm-11 col-md-11 col-lg-11 border-right border-top pt-1">
                    <div class="row">
                        ${groupChildrenHtml}
                    </div>
                </div>
                <div class="col-sm-1 col-md-1 col-lg-1">
                    <button type="button" class="btn btn-sm btn-success my-5 btn-add-group" data-group-id="${a.field_id}">
                        Add
                    </button>
                </div>
            </div>
        </div>`;
    }

    handleGroupAdd = (groupId) => {
        let groupRows = $(`div.row.group-row[data-group-id='${groupId}']`);
        let currentIndex = groupRows.length;
        // For now fix maximum group children as 5
        if (currentIndex < 5) {
            let groupTemplate = this.formFieldData.filter(a => a.group_id == groupId);
            let groupChildrenHtml = groupTemplate.map(b => {
                return `<div class="col-sm-3 col-md-3 col-lg-3">
                            <div class="form-group">
                                <label><small><b>${b.label}</b></small></label>
                                ${this.chooseFormElement(b, currentIndex)}
                            </div>
                        </div>`;
            }).join("\n");
            let newRowHtml = `<div class="row my-2 group-row" data-group-id="${groupId}" data-group-index="${currentIndex}">
                <div class="col-sm-11 col-md-11 col-lg-11 border-right border-top mt-2 pt-1">
                    <div class="row">
                        ${groupChildrenHtml}
                    </div>
                </div>
                <div class="col-sm-1 col-md-1 col-lg-1">
                    <div class="btn-group">
                        <button type="button" class="btn btn-sm btn-danger my-5 btn-remove-group" data-group-id="${groupId}" data-group-index="${currentIndex}">
                            Remove
                        </button>
                    </div>
                </div>
            </div>`;
            groupRows.last().after(newRowHtml);
            $(`select[data-group-id="${groupId}"][data-group-index="${currentIndex}"]`).selectpicker(this.spOptions);
            $(`select[data-type="lkp_sdg_goals"]`).on("change", e => {
                let goalIdsList = $(e.currentTarget).val().map(b => Number(b));
                let groupId = $(e.currentTarget).data("group-id");
                let groupIndex = $(e.currentTarget).data("group-index");
                let filteredTargets = this.lkpSdgTargetData.filter(b => goalIdsList.includes(b.goal_id)).map(b => b.value);
                $(`select[data-type="lkp_sdg_indicators"][data-group-id="${groupId}"][data-group-index="${groupIndex}"]`).selectpicker("val", filteredTargets);
                $(`select[data-type="lkp_sdg_indicators"][data-group-id="${groupId}"][data-group-index="${groupIndex}"]`).selectpicker("refresh");
            });
            this.initializeGroupHandlers();
        }
    }

    handleGroupRemove = (groupId, groupIndex) => {
        let groupRows = $(`div.row[data-group-id='${groupId}']`);
        if (groupRows.length > 1 && groupIndex > 0) { 
            // Prevent removing the first (index 0) group
            $(`div.row[data-group-id='${groupId}'][data-group-index='${groupIndex}']`).remove();
            // Update remaining indices after removal
            groupRows = $(`div.row[data-group-id='${groupId}']`);
            groupRows.each((i, row) => {
                $(row).attr('data-group-index', i);
                $(row).find('.btn-remove-group').attr('data-group-index', i);
            });
        }
    }

    initializeGroupHandlers = () => {
        // Bind the add button logic
        $(".btn-add-group").unbind("click").on("click", (e) => {
            let groupId = $(e.currentTarget).data("group-id");
            this.handleGroupAdd(groupId);
        });
        // Bind the remove button logic
        $(".btn-remove-group").unbind("click").on("click", (e) => {
            let groupId = $(e.currentTarget).data("group-id");
            let groupIndex = $(e.currentTarget).data("group-index");
            this.handleGroupRemove(groupId, groupIndex);
        });
    }


    fillUnderlyingLocations = (type, idList) => {
        switch(true){
            case type == "lkp_state":
                if(idList.length){
                    // provinces
                    let provincesHtml = idList.map(a => {
                        let filteredStates = this.lkpProvinceData.filter(b => b.country_id == a);
                        let countryName = this.lkpCountryData.find(b => b.value == a).label;
                        let optionsHtml = filteredStates.map(b => `<option value="${b.value}">${b.label}</option>`).join("\n");
                        return `<optgroup label="${countryName}">${optionsHtml}</optgroup>`;
                    }).join("\n");
                    $(`select[data-type="lkp_state"]`).empty().selectpicker("destroy");
                    $(`select[data-type="lkp_state"]`).html(provincesHtml).selectpicker(this.spOptions).selectpicker("refresh");
                    $(`select[data-type="lkp_state"]`).unbind("change").on("change", e => {
                        let provinceIdList = $(e.currentTarget).val().map(b => Number(b));
                        this.fillUnderlyingLocations("lkp_district", provinceIdList);
                        $(`select[data-type="lkp_state"]`).selectpicker("refresh");
                    });
                    $(`select[data-type="lkp_district"]`).empty().selectpicker(this.spOptions).selectpicker("refresh");
                } else{
                    $(`select[data-type="lkp_state"]`).empty().selectpicker(this.spOptions).selectpicker("refresh");
                    $(`select[data-type="lkp_district"]`).empty().selectpicker(this.spOptions).selectpicker("refresh");
                }
                break;
            case type == "lkp_district": // District -- idList == provinceIdList | API CALL FOR DS
                if(idList.length){
                    let districtsHtml = idList.map(a => {
                        let filteredDistricts = this.lkpDistrictData.filter(b => b.province_id == a);
                        let provinceName = this.lkpProvinceData.find(b => b.value == a).label;
                        let optionsHtml = filteredDistricts.map(b => `<option value="${b.value}">${b.label}</option>`).join("\n");
                        return `<optgroup label="${provinceName}">${optionsHtml}</optgroup>`;
                    }).join("\n");
                    $(`select[data-type="lkp_district"]`).empty().selectpicker("destroy");
                    $(`select[data-type="lkp_district"]`).html(districtsHtml).selectpicker(this.spOptions).selectpicker("refresh");
                    $(`select[data-type="lkp_district"]`).unbind("change").on("change", e => {
                        let distIdList = $(e.currentTarget).val().map(b => Number(b));
                        $(`select[data-type="lkp_district"]`).selectpicker("refresh");
                    });
                } else {
                    $(`select[data-type="lkp_district"]`).empty().selectpicker(this.spOptions).selectpicker("refresh");
                }
                break;
            default:
                break;
        }
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
            });
        });
    }

    postApi = (reqBody, reqHead, path) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "POST",
                "headers": reqHead,
                "data": JSON.stringify(reqBody),
                "contentType": "application/json",
                "beforeSend": () => this.startWaiting(),
                "url": `${this.apiUrl}/${path}`,
                "success": response => resolve(response),
                "error": err => reject(err)
            });
        });
    }

    postApiLocations = (reqBody, reqHead, path) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "POST",
                "headers": reqHead,
                "data": JSON.stringify(reqBody),
                "contentType": "application/json",
                "url": `${this.apiUrl}/${path}`,
                "success": response => resolve(response),
                "error": err => reject(err)
            });
        });
    }
    
    postWithFile = (reqHead, reqBody, path) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "POST",
                "url": `${this.apiUrl}/${path}`,
                "headers": reqHead,
                "data": reqBody,
                "processData": false,
                "contentType": false,
                "mimeType": "multipart/form-data",
                "beforeSend": () => this.stopWaiting(),
                "success": response => resolve(typeof (response) === "string" ? JSON.parse(response) : response),
                "error": err => reject(err)
            });
        });
    }

    arrayToString = arr => arr.length ? arr.join(",") : null;
    uqArray = (arr) => [...new Set(arr)];

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
