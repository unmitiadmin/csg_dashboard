$(window).on("load", () => {
    let countryId = parseInt(getCookies(document.cookie).countryId) || parseInt(getCookies(document.cookie).initialCountryId);
    let addProject = new AddProject(countryId);
    addProject.execute();
})

class AddProject {
    constructor(countryId) {
        this.apiUrl = apiUrl;
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
        this.inputProjectName = $("input#input_project_name");
        this.inputProjectDescription = $("input#input_project_description");
        this.inputDonors = $("select#input_donor_ids");
        this.inputStartDate = $("input#input_start_date");
        this.inputEndDate = $("input#input_end_date");
        this.inputBudget = $("input#input_budget");
        this.inputCountry = $("select#input_country_ids");
        this.inputHazards = $("select#input_hazard_ids");
        this.inputScale = $("select#input_scale_ids");
        this.inputTheme = $("select#input_theme_ids");
        this.inputApproach = $("select#input_approach_ids");

        this.lookupTableFields = {
            "country_ids": "country",
            "hazard_ids": "climate_hazard",
            "approach_ids": "approach",
            "scale_ids": "scale",
            "theme_ids": "theme",
            "donor_ids": "donor",
        };
        this.selectpickerCommonOptions = {
            actionsBox: true,
            liveSearch: true,
            selectedTextFormat: "count > 1",
            size: 5,
        }

        this.requestBody = {
            "project_name": null,
            "project_description": null,
            "donor_ids": null,
            "start_date": null,
            "end_date": null,
            "budget": null,
            "country_ids": null,
            "hazard_ids": null,
            "scale_ids": null,
            "theme_ids": null,
            "approach_ids": null,
        };

        this.buttonCancelAdding = $("button#cancel_add_project");
        this.buttonSaveNewProject = $("button#save_new_project");
    }

    execute = () => {
        // validate user and permissions here
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.logoutLink.on("click", this.onLogoutClick);
        if (this.isLoggedIn) {
            this.userRoleId != 1
                ? this.userCountryIcon.attr("src", `./assets/flag_icons/${this.initialCountryId}.png`).show()
                : this.userCountryIcon.attr("src", null).hide();
            this.getSelectOptionsFilled();
        } else {
            this.userCountryIcon.attr("src", null).hide();
            this.pageAlert("Please log in", 0);
            setTimeout(() => window.location.replace("index.html"), 1000);
        }
    }

    onLogoutClick = () => {
        document.cookie = `userEmail=null`;
        document.cookie = `jwt=null`;
        document.cookie = `isLoggedIn=false`;
        document.cookie = `userRoleId=null`;
        this.pageAlert("Logged out successfully", 0);
        setTimeout(() => window.location.replace("index.html"), 1000);
    }

    getSelectOptionsFilled = () => {
        this.postApi({}, {}, "catalog/lookups")
            .then(response => {
                let lookupData = response.data;
                Object.keys(this.lookupTableFields).forEach(a => {
                    let selectElement = $(`select#input_${a}`);
                    let lookupTableObj = lookupData.find(b => b.table == this.lookupTableFields[a]);
                    let lookupTable = lookupTableObj?.lookup_data;
                    let label = this.lookupTableFields[a];
                    selectElement.empty().html(lookupTable.map(b => `<option value="${b.id}">${b[label]}</option>`).join("\n"));
                    selectElement?.selectpicker("destroy");
                    selectElement.selectpicker(this.selectpickerCommonOptions);
                    selectElement.selectpicker("render");
                });
            })
            .then(() => this.enableSubmit())
            .catch(err => {
                this.pageAlert("Unable to get options' list from project lookups", 0);
                console.error(err)
            })
            .finally(this.stopWaiting);
    }

    prepareFormData = () => {
        this.requestBody = {
            "project_name": this.inputProjectName.val() || null,
            "project_description": this.inputProjectDescription.val() || null,
            "donor_ids": this.arrayToString(this.inputDonors.val()) || null,
            "start_date": this.inputStartDate.val() || null,
            "end_date": this.inputEndDate.val() || null,
            "budget": this.inputBudget.val() || null,
            "country_ids": this.arrayToString(this.inputCountry.selectpicker("val")) || null,
            "hazard_ids": this.arrayToString(this.inputHazards.selectpicker("val")) || null,
            "scale_ids": this.arrayToString(this.inputScale.selectpicker("val")) || null,
            "theme_ids": this.arrayToString(this.inputTheme.selectpicker("val")) || null,
            "approach_ids": this.arrayToString(this.inputApproach.selectpicker("val")) || null,
        };
        debugger;
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
        this.postApi(requestBody, this.authHeader, "catalog/manage")
            .then(response => {
                if (response.success) {
                    this.pageAlert(response.message, 1);
                    window.location.reload();
                }
            })
            .catch(err => {
                console.error(err);
                this.pageAlert(`Unable to save the form data\n${err.responseJSON.message}`, 0);
            })
            .finally(() => this.stopWaiting())
    }

    arrayToString = arr => arr.length ? arr.join(",") : null;
    uqArray = (arr) => [...new Set(arr)];

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
