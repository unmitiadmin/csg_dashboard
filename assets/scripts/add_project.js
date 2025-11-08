$(window).on("load", () => {
    let countryId = parseInt(getCookies(document.cookie).countryId) || parseInt(getCookies(document.cookie).initialCountryId);
    // let userEmail = parseInt(getCookies(document.cookie).userId);
    // let addProject = new AddProject(countryId);
    let addProject = new AddProject(countryId);
    addProject.init(); // include init as a precheck for logged in user's role
});

class AddProject {
    constructor(countryId) {
        this.apiUrl = apiUrl;
        this.lookupsReqBody = lookupsReqBody;
        this.countryId = countryId;

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

        // input fields
        this.inputCountry = $("select#input_country");
        this.inputProvince = $("select#input_province");
        this.inputDistrict = $("select#input_district");
        this.inputProjectName = $("input#input_project_name");
        this.filterCategory = $("select#input_category");   // lookup
        this.inputProjectDescription = $("input#input_project_description");
        // this.filterStartYear = $("select#input_start_year");    // single-select
        this.filterStartYear = $("input#input_start_year");
        // this.filterEndYear = $("select#input_end_year");    // single-select
        this.filterEndYear = $("input#input_end_year");
        this.inputFundingAmount = $("input#input_funding_amount");
        this.filterAgroEcology = $("select#input_agro_ecology");    // lookup
        this.inputNumberOfBeneficiaries = $("input#input_number_of_beneficiaries");
        this.filterTypesOfBeneficiaries = $("select#input_types_of_beneficiaries"); // lookup
        this.filterBeneficiariesCategories = $("select#input_beneficiaries_categories");    // lookup
        this.filterSector = $("select#input_sector");   // lookup
        this.filterClimateHazard = $("select#input_climate_hazard");    // lookup
        this.filterRisk = $("select#input_risk");   // lookup
        this.filterPurposeOfAdaptation = $("select#input_purpose_of_adaptation");   // lookup
        this.filterAdaptationTypology = $("select#input_adaptation_typology");  // lookup
        this.filterAdaptationSubCategory = $("select#input_adaptation_typology_subcategory"); // lookup
        this.inputAdaptationDescription = $("input#input_adaptation_description");
        // this.inputAdaptationCategory1 = $("input#input_adaptation_category_1");
        // this.inputAdaptationCategory2 = $("input#input_adaptation_category_2");
        // this.inputAdaptationCategory3 = $("input#input_adaptation_category_3");
        // this.inputAdaptationCategory4 = $("input#input_adaptation_category_4");
        // this.inputAdaptationCategory5 = $("input#input_adaptation_category_5");
        // this.inputAdaptationCategory6 = $("input#input_adaptation_category_6");
        // this.inputAdaptationCategory7 = $("input#input_adaptation_category_7");
        // this.inputAdaptationCategory8 = $("input#input_adaptation_category_8");
        // this.inputAdaptationCategory9 = $("input#input_adaptation_category_9");
        // this.inputAdaptationCategory10 = $("input#input_adaptation_category_10");
        this.filterScale = $("select#input_scale"); // lookup
        this.filterGovernanceLevel = $("select#input_governance_level");
        this.filterFundingOrganization = $("select#input_funding_organizations");   // lookup
        this.filterImplementationPartners = $("select#input_implementation_partners");  // lookup
        this.filterOtherPartners = $("select#input_other_partners");    // lookup
        this.filterCurrentStatus = $("select#input_current_status");    // lookup
        this.inputSdgGoals = $("select#input_sdg_goals");   // lookup
        this.inputSendaiIndicators = $("select#input_sendai_drr_indicators");   // lookup

        this.lookupTableFields = {
            "category": "category",
            "agro_ecology": "agro_ecology",
            "types_of_beneficiaries": "type",
            "beneficiaries_categories": "category",
            "sector": "sector",
            "climate_hazard": "climate_hazard",
            "risk": "risk",
            "purpose_of_adaptation": "purpose",
            "adaptation_typology": "typology",
            "adaptation_typology_subcategory": "typology_sub_category",
            "scale": "scale",
            "governance_level": "level",
            "funding_organizations": "funding_organization",
            "implementation_partners": "implementation_partner",
            "other_partners": "other_partner",
            "current_status": "current_status",
            "country": "country",
            "province": "province",
            "district": "district",
            "sdg_goals": "goal",
            "sendai_drr_indicators": "indicator",
        };
        this.emptyOption = `<option value="">----</option>\n`;
        this.yearsArray = Array.from({ length: 71 }, (_, index) => 1980 + index);
        this.selectpickerCommonOptions = {
            actionsBox: true,
            liveSearch: true,
            selectedTextFormat: "count > 1",
            size: 5,
        }

        this.requestBody = {
            // all form field values here, with respective names
            "country_id": this.countryId,
            "multiple_country_ids": null,
            "province_id": null,
            "district_id": null,
            "project_name": null,
            "category": null,
            "project_description": null,
            "start_year": null,
            "end_year": null,
            "funding_amount": null,
            "funding_amount_by_country": [],
            "agro_ecology": null,
            "number_of_beneficiaries": null,
            "types_of_beneficiaries": null,
            "beneficiaries_categories": null,
            "sector": null,
            "climate_hazard": null,
            "risk": null,
            "purpose_of_adaptation": null,
            "adaptation_typology": null,
            "adaptation_typology_subcategory": null,
            "adaptation_description": null,
            // "adaptation_category_1": null,
            // "adaptation_category_2": null,
            // "adaptation_category_3": null,
            // "adaptation_category_4": null,
            // "adaptation_category_5": null,
            // "adaptation_category_6": null,
            // "adaptation_category_7": null,
            // "adaptation_category_8": null,
            // "adaptation_category_9": null,
            // "adaptation_category_10": null,
            "scale": null,
            "governance_level": null,
            "funding_organizations": null,
            "implementation_partners": null,
            "other_partners": null,
            "sdg_impacted": null,
            "sendai_framework_indicators": null,
            "current_status": null,
        };

        this.multiCountryBudgetFieldContainer = $("div#multicountry-budget");
        this.lkpCountry = [];
        this.lkpProvince = [];
        this.lkpDistrict = [];
        this.lkpTypology = [];
        this.lkpTypologySubCat = [];
        this.budgetByCountry = [];
        this.selectedCountryIds = [];
        this.selectedProvinceIds = [];

        this.buttonCancelAdding = $("button#cancel_add_project");
        this.buttonSaveNewProject = $("button#save_new_project");

        this.countrySubLocationIndex = {
            '4': "sublocation_srilanka",
        };

        this.inputSrilankaDS = $("select#input_sl_ds");
        this.inputSrilankaASC = $("select#input_sl_asc");
        this.inputSrilankaARPA = $("select#input_sl_arpa");
        this.inputSrilankaGN = $("select#input_sl_gn");

        this.srilankaSubLocations = {
            "ds": [],
            "asc": [],
            "arpa": [],
            "gn": []
        };

        this.flagIndex = {
            2: "Zambia",
            4: "Sri Lanka",
            7: "Senegal",
            5: "Kenya",
        };
    }

    init = () => {
        // call self, if role_id <= 2, then go for execute(), othewise logout 
        // only product admin and country admin are allowed here
        this.getApi(this.authHeader, "auth/self")
        .then(response => {
            if (response.data.role_id <= 2) this.execute();
            else {
                this.pageAlert("You are unauthorized to add a project", 0);
                setTimeout(() => window.location.replace("index.html"), 3000);
            }
        })
        .catch(err => {
            console.error(err);
            this.pageAlert("You are unauthorized to add a project", 0);
            setTimeout(() => window.location.replace("index.html"), 3000);
        })
        .finally(this.stopWaiting);
    }

    execute = () => {
        // Start year - calendar select
        this.filterStartYear.datepicker({
            format: "yyyy",
            viewMode: "years",
            minViewMode: "years",
            autoclose: true,
        });
        // End year - calendar select
        this.filterEndYear.datepicker({
            format: "yyyy",
            viewMode: "years",
            minViewMode: "years",
            autoclose: true,
        });

        // validate user and permissions here
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.logoutLink.on("click", this.onLogoutClick);
        if (this.isLoggedIn) {
            this.userRoleId != 1
                ? this.userCountryIcon.attr("src", `./assets/flag_icons/${this.initialCountryId}.png`).attr("title", this.flagIndex[this.initialCountryId]).show()
                : this.userCountryIcon.attr("src", null).attr("title", null).hide();
            // this.userRoleId != 1 ? this.inputCountry.attr("disable", true) : this.inputCountry.attr("disable", false);
            this.getSelectOptionsFilled();
        } else {
            this.pageAlert("Please login", 0);
            this.userCountryIcon.attr("src", null).attr("title", null).hide();
            window.location.replace("mande_tool.html");
        }
    }

    onLogoutClick = () => {
        document.cookie = `userEmail=null`;
        document.cookie = `jwt=null`;
        document.cookie = `isLoggedIn=false`;
        document.cookie = `initialCountryId=null`;
        document.cookie = `userRoleId=null`;
        this.pageAlert("Logged out successfully", 1);
        setTimeout(() => window.location.replace("mande_tool.html"), 1000);
    }

    getSelectOptionsFilled = () => {
        this.postApi(this.lookupsReqBody, {}, "projects/lookups")
            .then(response => {
                let lookupData = response.data;
                this.lkpCountry = lookupData.find(a => a.table == "country").lookup_data;
                this.lkpProvince = lookupData.find(a => a.table == "province").lookup_data;
                this.lkpDistrict = lookupData.find(a => a.table == "district").lookup_data;
                this.lkpTypology = lookupData.find(a => a.table == "adaptation_typology").lookup_data;
                this.lkpTypologySubCat = lookupData.find(a => a.table == "adaptation_typology_subcategory").lookup_data;
                // Multiselect - Selectpicker
                Object.keys(this.lookupTableFields).forEach(a => {
                    let selectElement = $(`select#input_${a}`);
                    let lookupTableObj = lookupData.find(b => b.table == a);
                    let lookupTable = lookupTableObj?.lookup_data;
                    let label = this.lookupTableFields[a];

                    if (a == "province") {
                        this.lkpProvince.sort((b, c) => b.country_id > c.country_id ? 0 : -1);
                        let uniqueCountries = this.uqArray(lookupTable.filter(b => b.country_id != 1).map(b => b.country));
                        let provinceHtml = uniqueCountries.map(b => {
                            let provinceOptions = lookupTable.filter(c => c.country == b).map(c => {
                                return `<option value="${c.province_id}">${c.province}</option>`
                            }).join("\n")
                            return `<optgroup label="${b}">${provinceOptions}</optgroup>`;
                        }).join("\n");
                        selectElement.empty().html(provinceHtml);
                    } else if (a == "district") {
                        this.lkpDistrict.sort((b, c) => b.country_id > c.country_id ? 0 : -1)
                        let uniqueCountries = this.uqArray(lookupTable.filter(b => b.country_id != 1).map(b => b.country));
                        let districtHtml = uniqueCountries.map(b => {
                            let provincesUnderCountry = this.uqArray(lookupTable.filter(c => c.country == b).map(c => c.province))
                            let provinceOptGroups = provincesUnderCountry.map(c => {
                                let districtOptions = lookupTable.filter(d => d.country == b && d.province == c).map(d => {
                                    return `<option value="${d.district_id}">${d.district}</options>`;
                                }).join("\n");
                                return `<optgroup label="${c} (${b})">${districtOptions}</optgroup>`;
                            }).join("\n");
                            return provinceOptGroups
                        })
                        selectElement.empty().html(districtHtml);
                    } else if (a == "adaptation_typology_subcategory") {
                        this.lkpTypology.sort((b, c) => b.id > c.id ? 0 : -1);
                        let typologySubCatHtml = this.lkpTypology.map(b => {
                            let subCatOptions = lookupTable.filter(c => c.typology_id == b.id).map(c => {
                                return `<option value="${c.id}">${c.typology_sub_category}</option>`
                            }).join("\n");
                            return `<optgroup label="${b.typology}">${subCatOptions}</optgroup>`;
                        }).join("\n");
                        selectElement.empty().html(typologySubCatHtml)
                    } else if(a == "category"){
                        selectElement.empty().html(
                            lookupTable.filter(b => b.id != 4).map(b => `<option value="${b.id}">${b[label]}</option>`).join("\n")
                        )
                    } else {
                        selectElement.empty().html(a == "country"
                            ? lookupTable.filter(b => b.id != 1).map(b => `<option value="${b.id}">${b[label]}</option>`).join("\n")
                            : lookupTable.map(b => `<option value="${b.id}">${b[label]}</option>`).join("\n")
                        );
                    }

                    selectElement?.selectpicker("destroy");
                    selectElement.selectpicker(this.selectpickerCommonOptions);
                });
                // Single-select
                // this.filterStartYear.empty().html(this.emptyOption + this.yearsArray.map(year => `<option value="${year}">${year}</option>`).join("\n"));
                // this.filterEndYear.empty().html(this.emptyOption + this.yearsArray.map(year => `<option value="${year}">${year}</option>`).join("\n"));
                // this.filterStartYear.selectpicker(this.selectpickerCommonOptions);
                // this.filterEndYear.selectpicker(this.selectpickerCommonOptions);

            })
            .then(() => this.enableMultiProvince())
            .then(() => this.enableMultiCountryBudgetFields())
            .then(() => this.enableMultiTypology())
            .then(() => this.enableSubmit())
            .then(() => {
                if(this.initialCountryId == this.countryId && this.userRoleId != 1){
                    this.inputCountry.val(this.initialCountryId).trigger("change");
                } else this.inputCountry.val(this.countryId).trigger("change")
                
                this.inputCountry.attr("disabled", !(this.userRoleId == 1));
                this.inputCountry.selectpicker("refresh");
            })
            .catch(err => {
                console.error(err);
                this.pageAlert(err.responseJSON.message, 0);
                if (err.status == 401) {
                    this.onLogoutClick()
                }
            })
            .finally(this.stopWaiting);
    }

    fillProvinceFilter = () => {
        let countryIds = this.inputCountry.selectpicker("val");
        let provincesByCountry = countryIds.length
            ? this.lkpProvince.filter(a => countryIds.includes(`${a.country_id}`))
            : []
        if (provincesByCountry.length) {
            let provinceIds = provincesByCountry.map(b => `${b.province_id}`);
            let provinceTable = this.lkpProvince.filter(b => provinceIds.includes(`${b.province_id}`))
            let uniqueCountries = this.uqArray(provinceTable.map(b => b.country));
            let provinceHtml = uniqueCountries.map(b => {
                let provinceOptions = provinceTable.filter(c => c.country == b).map(c => {
                    return `<option value="${c.province_id}">${c.province}</option>`
                }).join("\n")
                return `<optgroup label="${b}">${provinceOptions}</optgroup>`;
            }).join("\n");
            this.inputProvince.empty().html(provinceHtml).val(provinceIds).trigger("change");
        } else {
            this.inputProvince.empty();
        }
        this.inputProvince.selectpicker("refresh");
    }


    enableMultiCountryBudgetFields = () => {
        this.inputCountry.unbind("change").on("change", () => {
            let countryIds = this.inputCountry.selectpicker("val");
            // multiple country
            Object.keys(this.countrySubLocationIndex).forEach(a => {
                countryIds.includes(a) ? this.activateSubLocationFields(a) : this.deactivateSublocationFields(a);
            });

            if (countryIds.length > 1) {
                this.selectedCountryIds = countryIds;
                if (this.selectedCountryIds) {
                    const fieldsToRemove = this.selectedCountryIds.filter(id => !countryIds.includes(id));
                    fieldsToRemove.forEach(countryId => {
                        $(`input[type='number'].multicountry-budget-field[data-country-id="${countryId}"]`).closest('.col-sm-12.col-md-4.col-lg-4').remove();
                    });
                }
                this.addMultiCountryBudgetFields(countryIds);
                this.inputFundingAmount.attr("disabled", true);
            } else {
                this.inputFundingAmount.val("")
                this.multiCountryBudgetFieldContainer.empty();
                this.inputFundingAmount.attr("disabled", false);
            }

            this.inputCountry.selectpicker("refresh");
            this.inputProvince.selectpicker("refresh")
            this.fillProvinceFilter();
            this.fillDistrictFilter();
        });
    }

    fillDistrictFilter = () => {

        let provinceIds = this.inputProvince.selectpicker("val");
        let districtsByProvince = provinceIds.length
            ? this.lkpDistrict.filter(a => provinceIds.includes(`${a.province_id}`))
            : [];
        if (districtsByProvince.length) {
            let districtIds = districtsByProvince.map(b => `${b.district_id}`);
            let districtTable = this.lkpDistrict.filter(b => districtIds.includes(`${b.district_id}`));
            let uniqueCountries = this.uqArray(districtTable.map(b => b.country));
            let districtHtml = uniqueCountries.map(b => {
                let provincesUnderCountry = this.uqArray(districtTable.filter(c => c.country == b).map(c => c.province))
                let provinceOptGroups = provincesUnderCountry.map(c => {
                    let districtOptions = districtTable.filter(d => d.country == b && d.province == c).map(d => {
                        return `<option value="${d.district_id}">${d.district}</options>`;
                    }).join("\n");
                    return `<optgroup label="${c} (${b})">${districtOptions}</optgroup>`;
                }).join("\n");
                return provinceOptGroups
            });
            this.inputDistrict.empty().html(districtHtml).val(districtIds).trigger("change");
        } else {
            this.inputDistrict.empty();
        }

        this.inputDistrict.selectpicker("refresh");
    }

    enableMultiProvince = () => {
        this.inputProvince.unbind("change").on("change", () => {
            let provinceIds = this.inputProvince.selectpicker("val");
            this.selectedProvinceIds = provinceIds;
            this.fillDistrictFilter();
            this.inputProvince.selectpicker("refresh");
        });
    }

    addMultiCountryBudgetFields = (countryIds) => {
        let newBudgets = [];
        let fieldsHtml = countryIds.map(a => {
            let existingField = $(`input[type='number'].multicountry-budget-field[data-country-id="${a}"]`);
            if (existingField.length === 0) {
                let countryObj = this.lkpCountry.find(b => b.id == a);
                newBudgets.push({
                    country_id: a,
                    funding_amount: null
                });
                return `<div class="col-sm-12 col-md-4 col-lg-4">
                    <div class="form-group">
                        <label for="country_${a}">Funding Amount for ${countryObj.country}</label>
                        <input type="number" class="form-control multicountry-budget-field" name="country_${a}" data-country-name="${countryObj.country}" data-country-id="${a}"/>
                    </div>
                </div>`;
            }
            return '';
        }).join("\n");

        let fieldsToRemove = Array.from(this.budgetByCountry, item => item.country_id).filter(countryId => !countryIds.includes(countryId));
        fieldsToRemove.forEach(countryId => {
            $(`input[type='number'].multicountry-budget-field[data-country-id="${countryId}"]`).remove();
            this.budgetByCountry = this.budgetByCountry.filter(item => item.country_id !== countryId);
        });
        this.multiCountryBudgetFieldContainer.append(fieldsHtml);
        this.budgetByCountry = [...this.budgetByCountry, ...newBudgets];
        this.sumOfCountryBudgets();
    }

    sumOfCountryBudgets = () => {
        let totalBudget = 0;
        $("input[type='number'].multicountry-budget-field").on("input", (e) => {
            const allInputs = $("input[type='number'].multicountry-budget-field");
            totalBudget = 0;
            allInputs.each((index, input) => {
                const currentValue = parseFloat($(input).val());
                const countryId = $(input).data('country-id');
                if (!isNaN(currentValue)) {
                    totalBudget += currentValue;
                    const countryIndex = this.budgetByCountry.findIndex(item => item.country_id == countryId);
                    if (countryIndex !== -1) this.budgetByCountry[countryIndex].funding_amount = currentValue;
                } else {
                    const countryIndex = this.budgetByCountry.findIndex(item => item.country_id == countryId);
                    if (countryIndex !== -1) this.budgetByCountry[countryIndex].funding_amount = null;
                }
            });
            this.inputFundingAmount.val(totalBudget);
        });
    }

    fillTypologyCategoryFilter = () => {
        let typologyIds = this.filterAdaptationTypology.selectpicker("val");
        let subCatsByTypology = typologyIds.length
            ? this.lkpTypologySubCat.filter(a => typologyIds.includes(`${a.typology_id}`))
            : [];
        if (subCatsByTypology.length) {
            let subCatIds = subCatsByTypology.map(b => `${b.id}`);
            let typologySubCatHtml = typologyIds.map(b => {
                let subCatOptions = this.lkpTypologySubCat.filter(c => c.typology_id == b).map(c => {
                    return `<option value="${c.id}">${c.typology_sub_category}</option>`;
                }).join("\n");
                let typologyName = this.lkpTypology.find(c => c.id == b).typology;
                return `<optgroup label="${typologyName}">${subCatOptions}</optgroup>`;
            }).join("\n");
            this.filterAdaptationSubCategory.empty().html(typologySubCatHtml).val(subCatIds).trigger("change");
        } else {
            this.filterAdaptationSubCategory.empty();
        }
        this.filterAdaptationSubCategory.selectpicker("refresh");
    }

    enableMultiTypology = () => {
        this.filterAdaptationTypology.unbind("change").on("change", () => {
            let typologyIds = this.filterAdaptationTypology.selectpicker("val");
            if (typologyIds.length) {
                this.fillTypologyCategoryFilter();
            } else {
                this.fillTypologyCategoryFilter();
            }
            this.filterAdaptationTypology.selectpicker("refresh");
        });
    }

    prepareFormData = () => {
        this.requestBody = {
            // all form field values here, with respective names
            "country_id": this.budgetByCountry.length > 1 ? 1 : this.inputCountry.val()[0],
            "multiple_country_ids": this.inputCountry.selectpicker("val").length > 1 ? this.arrayToString(this.inputCountry.selectpicker("val")) : null,
            "province_id": this.arrayToString(this.inputProvince.selectpicker("val")) || null,
            "district_id": this.arrayToString(this.inputDistrict.selectpicker("val")) || null,
            "project_name": this.inputProjectName.val() || null,
            "category": this.arrayToString(this.filterCategory.selectpicker("val")),
            "project_description": this.inputProjectDescription.val() || null,
            "start_year": this.filterStartYear.val() || null,
            "end_year": this.filterEndYear.val() || null,
            "funding_amount": this.inputFundingAmount.val() ? Number(this.inputFundingAmount.val()) : null,
            "funding_amount_by_country": this.budgetByCountry.length && this.budgetByCountry.map(a => a.funding_amount).every(Boolean)
                ? this.budgetByCountry.filter(a => a.funding_amount)
                : [],
            "agro_ecology": this.arrayToString(this.filterAgroEcology.selectpicker("val")),
            "number_of_beneficiaries": this.inputNumberOfBeneficiaries.val() ? Number(this.inputNumberOfBeneficiaries.val()) : 0,
            "types_of_beneficiaries": this.arrayToString(this.filterTypesOfBeneficiaries.selectpicker("val")),
            "beneficiaries_categories": this.arrayToString(this.filterBeneficiariesCategories.selectpicker("val")),
            "sector": this.arrayToString(this.filterSector.selectpicker("val")),
            "climate_hazard": this.arrayToString(this.filterClimateHazard.selectpicker("val")),
            "risk": this.arrayToString(this.filterRisk.selectpicker("val")),
            "purpose_of_adaptation": this.arrayToString(this.filterPurposeOfAdaptation.selectpicker("val")),
            "adaptation_typology": this.arrayToString(this.filterAdaptationTypology.selectpicker("val")),
            "adaptation_typology_subcategory": this.arrayToString(this.filterAdaptationSubCategory.selectpicker("val")),
            "adaptation_description": this.inputAdaptationDescription.val() || null,
            "scale": this.arrayToString(this.filterScale.selectpicker("val")),
            "governance_level": this.arrayToString(this.filterGovernanceLevel.selectpicker("val")),
            "funding_organizations": this.arrayToString(this.filterFundingOrganization.selectpicker("val")),
            "implementation_partners": this.arrayToString(this.filterImplementationPartners.selectpicker("val")),
            "other_partners": this.arrayToString(this.filterOtherPartners.selectpicker("val")),
            "sdg_impacted": this.arrayToString(this.inputSdgGoals.selectpicker("val")) || null,
            "sendai_framework_indicators": this.arrayToString(this.inputSendaiIndicators.selectpicker("val")) || null,
            "current_status": this.filterCurrentStatus.val() || null,
            "sublocation_ids": null
        }
        if (this.inputCountry.val().includes("4")) {
            this.requestBody.sublocation_ids = {
                "ds_ids": this.inputSrilankaDS.val(),
                "asc_ids": this.inputSrilankaASC.val(),
                "arpa_ids": this.inputSrilankaARPA.val(),
                "gn_ids": this.inputSrilankaGN.val()
            }
        }
        Object.keys(this.lookupTableFields).forEach(a => {
            let selectElement = $(`select#input_${a}`);
            selectElement.selectpicker("render");
        });
    }

    enableSubmit = () => {
        this.buttonSaveNewProject.unbind("click")
            .on("click", () => {
                this.prepareFormData();
                this.submitFormData(this.requestBody);
            })
    }


    submitFormData = (requestBody) => {
        // add new project ManageView (POST)
        this.postApi(requestBody, this.authHeader, "projects/manage")
            .then(response => {
                if (response.success) {
                    this.pageAlert(response.message, 1);
                    setTimeout(() => window.location.replace(`mande_tool.html`), 1000);
                }
            })
            .catch(err => {
                console.error(err);
                this.pageAlert(err.responseJSON.message, 0);
                if (err.status == 401) {
                    setTimeout(() => this.onLogoutClick(), 1000)
                }
            })
            .finally(() => this.stopWaiting())
    }



    // Sub locations section - beyond first 2 levels

    activateSubLocationFields = (countryId) => {
        let countryClass = this.countrySubLocationIndex[countryId];
        let fieldSelectors = $(`div.sublocation_field.${countryClass}`);
        fieldSelectors.show();
        switch (true) {
            case countryId == '4':
                this.inputDistrict.on("change", () => {
                    let districtIds = this.inputDistrict.selectpicker("val").map(a => parseInt(a));
                    if (districtIds.length) {
                        this.fillFilterSrilankaDS(districtIds);
                    }
                });
                break;
            default:
                break;
        }
    }

    deactivateSublocationFields = (countryId) => {
        let countryClass = this.countrySubLocationIndex[countryId];
        let fieldSelectors = $(`div.sublocation_field.${countryClass}`);
        fieldSelectors.hide();
        switch (true) {
            case countryId == '4':
                this.srilankaSubLocations = {
                    "ds": [],
                    "asc": [],
                    "arpa": [],
                    "gn": []
                };
                this.inputSrilankaDS.empty();
                this.inputSrilankaASC.empty();
                this.inputSrilankaARPA.empty();
                this.inputSrilankaGN.empty();
                break;
            default:
                break;
        }
    }

    // only for srilanka sublocations
    // DS > ASC > ARPA > GN
    // this.inputSrilankaDS = $("select#input_sl_ds");
    // this.inputSrilankaASC = $("select#input_sl_asc");
    // this.inputSrilankaARPA = $("select#input_sl_arpa");
    // this.inputSrilankaGN = $("select#input_sl_gn");

    fillFilterSrilankaDS = (districtIds) => {
        let reqBody = { "country_id": 4, "purpose": "get_ds", "district_ids": districtIds };
        this.postApi(reqBody, {}, "projects/sub_locations")
            .then(response => {
                if (response.success) {
                    let optionsHtml = districtIds.map(a => {
                        let subset = response.data.filter(b => b.district_id == a);
                        if (subset.length) return `<optgroup label="${subset[0].district}">`
                            + subset.map(b => `<option value="${b.ds_id}">${b.ds}</option>`).join("\n")
                            + `</optgroup>`;
                    }).filter(Boolean).join("\n");
                    this.inputSrilankaDS.empty().selectpicker("destroy");
                    this.inputSrilankaDS.html(optionsHtml).selectpicker(this.selectpickerCommonOptions)
                    // this.inputSrilankaDS.selectpicker("selectAll");
                    this.inputSrilankaDS.on("change", () => {
                        let selectedDSIds = this.inputSrilankaDS.selectpicker("val").map(a => parseInt(a));
                        if (selectedDSIds.length) this.fillFilterSrilankaASC(selectedDSIds);
                    });
                } else throw new Error("Unable to get DS list - Sri Lanka");
            })
            .catch(err => {
                console.error(err);
                this.pageAlert("Unable to get DS list - Sri Lanka", 0);
            })
            .finally(this.stopWaiting);
    }

    fillFilterSrilankaASC = (dsIds) => {
        let reqBody = { "country_id": 4, "purpose": "get_asc", "ds_ids": dsIds };
        this.postApi(reqBody, {}, "projects/sub_locations")
            .then(response => {
                if (response.success) {
                    let optionsHtml = dsIds.map(a => {
                        let subset = response.data.filter(b => b.ds_id == a);
                        if (subset.length) return `<optgroup label="${subset[0].ds}">`
                            + subset.map(b => `<option value="${b.asc_id}">${b.asc}</option>`).join("\n")
                            + `</optgroup>`;
                    }).filter(Boolean).join("\n");
                    this.inputSrilankaASC.empty().selectpicker("destroy");
                    this.inputSrilankaASC.html(optionsHtml).selectpicker({ ...this.selectpickerCommonOptions, width: 100 });
                    // this.inputSrilankaASC.selectpicker("selectAll");
                    this.inputSrilankaASC.on("change", () => {
                        let ascIds = this.inputSrilankaASC.selectpicker("val").map(a => parseInt(a));
                        if (ascIds.length) this.fillFilterSrilankaARPA(ascIds);
                    });
                } else throw new Error("Unable to get ASC list - Sri Lanka");
            })
            .catch(err => {
                console.error(err);
                this.pageAlert("Unable to get ASC list - Sri Lanka", 0)
            })
            .finally(this.stopWaiting);
    }

    fillFilterSrilankaARPA = (ascIds) => {
        let reqBody = { "country_id": 4, "purpose": "get_arpa", "asc_ids": ascIds };
        this.postApi(reqBody, {}, "projects/sub_locations")
            .then(response => {
                if (response.success) {
                    let optionsHtml = ascIds.map(a => {
                        let subset = response.data.filter(b => b.asc_id == a);
                        if (subset.length) return `<optgroup label="${subset[0].asc}">`
                            + subset.map(b => `<option value="${b.arpa_id}">${b.arpa}</option>`).join("\n")
                            + `</optgroup>`;
                    });
                    this.inputSrilankaARPA.empty().selectpicker("destroy");
                    this.inputSrilankaARPA.html(optionsHtml).selectpicker(this.selectpickerCommonOptions);
                    // this.inputSrilankaARPA.selectpicker("selectAll");
                    this.inputSrilankaARPA.on("change", () => {
                        let arpaIds = this.inputSrilankaARPA.selectpicker("val");
                        if (arpaIds.length) this.fillFilterSrilankaGN(arpaIds);
                    });
                } else throw new Error("Unable to get ARPA list - Sri Lanka");
            })
            .catch(err => {
                console.error(err);
                this.pageAlert("Unable to get ARPA list - Sri Lanka", 0)
            })
            .finally(this.stopWaiting);
    }

    fillFilterSrilankaGN = (arpaIds) => {
        let reqBody = { "country_id": 4, "purpose": "get_gn", "arpa_ids": arpaIds };
        this.postApi(reqBody, {}, "projects/sub_locations")
            .then(response => {
                if (response.success) {
                    let optionsHtml = arpaIds.map(a => {
                        let subset = response.data.filter(b => b.arpa_id == a);
                        if (subset.length) return `<optgroup label="${subset[0].arpa}">`
                            + subset.map(b => `<option value="${b.gn_id}">${b.gn}</option>`).join("\n")
                            + `</optgroup>`;
                    });
                    this.inputSrilankaGN.empty().selectpicker("destroy");
                    this.inputSrilankaGN.html(optionsHtml).selectpicker(this.selectpickerCommonOptions);
                } else throw new Error("Unable to get GN list - Sri Lanka");
            })
            .catch(err => {
                console.error(err);
                this.pageAlert("Unable to get GN list - Sri Lanka", 0)
            })
            .finally(this.stopWaiting);
    }


    arrayToString = arr => arr.length ? arr.join(",") : null;
    uqArray = (arr) => [...new Set(arr)];

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
            })
        })
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