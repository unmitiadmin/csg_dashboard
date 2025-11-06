$(window).on("load", () => {
    let countryId = parseInt(getCookies(document.cookie).countryId) || parseInt(getCookies(document.cookie).initialCountryId);
    const urlObject = new URL(window.location.href);
    const params = Array.from(urlObject.searchParams.keys()).map(a => {
        let result = {};
        result[a] = urlObject.searchParams.get(a);
        return result;
    }).reduce((a, b) => Object.assign(a, b), {});
    let addOutcome = new EditOutput(countryId, params);
    addOutcome.init();
});


class EditOutput {
    constructor(countryId, params) {
        this.countryId = countryId
        this.projectId = params.project_id;
        this.outcomeId = params.outcome_id;
        this.outputId = params.output_id;
        this.apiUrl = apiUrl;

        this.cookieObject = getCookies(document.cookie);
        this.jwt = this.cookieObject.jwt;
        this.userEmail = this.cookieObject.userEmail;
        this.isLoggedIn = this.cookieObject.isLoggedIn;
        this.authHeader = { "Authorization": this.jwt };
        this.logoutLink = $("a#link-logout");
        this.userMgmtLink = $("li#user-management-link");
        this.loggedInUserEmailLabel = $("li#user-email-label");

        this.labelProjectName = $("li#breadcrumb-project-name");
        this.labelStaticProjectId = $("span#static-project-id");
        this.labelOutcomeName = $("li#breadcrumb-outcome-name");
        this.labelStaticOutcomeId = $("span#static-outcome-id");
        this.labelOutputName = $("li#breadcrumb-output-name");

        this.inputNameField = $("input#input_output_name");
        this.inputDescriptionField = $("textarea#input_output_description");
        this.buttonCancelAdding = $("button#cancel_add_output");
        this.buttonSaveNewOutput = $("button#save_new_output");

        this.flagIndex = {
            2: "Zambia",
            4: "Sri Lanka",
            7: "Senegal",
            5: "Kenya",
        };
    }

    init = () => {
        this.getApi(this.authHeader, "auth/self")
        .then(response => {
            if (response.data.role_id <= 4) this.execute();
            else {
                alert("You are unauthorized to edit this output");
                window.location.replace("index.html");
            }
        })
        .catch(err => {
            console.error(err);
            alert("You are unauthorized to edit this output");
            window.location.replace("index.html");
        })
        .finally(this.stopWaiting);
    }

    execute = () => {
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.logoutLink.on("click", this.onLogoutClick);
        if (this.isLoggedIn) {
            this.userRoleId != 1
                ? this.userCountryIcon.attr("src", `./assets/flag_icons/${this.initialCountryId}.png`).attr("title", this.flagIndex[this.initialCountryId]).show()
                : this.userCountryIcon.attr("src", null).attr("title", null).hide();
            this.fetchData();
        } else {
            alert("Please login");
            this.userCountryIcon.attr("src", null).attr("title", null).hide();
            window.location.replace("mande_tool.html");
        }
    }

    fetchData = () => {
        Promise.all([
            this.getApi(this.authHeader, `projects/output?project_id=${this.projectId}&outcome_id=${this.outcomeId}&output_id=${this.outputId}`),
            this.getApi(this.authHeader, `projects/outcome?project_id=${this.projectId}&outcome_id=${this.outcomeId}`),
            this.getApi(this.authHeader, `projects/manage?project_id=${this.projectId}`)
        ])
            .then(([outputResponse, outcomeResponse, detailsResponse]) => {
                if (outputResponse.success && outcomeResponse.success && detailsResponse.success) {
                    let manageViewPage = `<a href="manage_outcomes.html?project_id=${detailsResponse.data.project_id}">${detailsResponse.data.project_name}</a>`
                    this.labelProjectName.empty().html(manageViewPage);
                    this.labelStaticProjectId.empty().html(detailsResponse.data.project_id);
                    let outcomePage = `<a href="manage_outputs.html?project_id=${detailsResponse.data.project_id}&outcome_id=${outcomeResponse.data.outcome_id}">${outcomeResponse.data.outcome}</a>`;
                    this.labelOutcomeName.empty().html(outcomePage);
                    this.labelStaticOutcomeId.empty().html(outcomeResponse.data.outcome_id);
                    this.labelOutputName.empty().html(outputResponse.data.output)
                    this.inputNameField.val(outputResponse.data.output);
                    this.inputDescriptionField.val(outputResponse.data.description);
                    this.enableForm();
                }
            })
            .catch(err => {
                console.error(err);
                if (err.status == 401) alert("Session expired, please login");
                else alert("Unable to get data");
            })
            .finally(() => this.stopWaiting())
    }

    enableForm = () => {
        this.buttonSaveNewOutput.unbind("click").on("click", () => {
            let nameVal = this.inputNameField.val();
            let descriptionVal = this.inputDescriptionField.val();

            let isValid = nameVal.trim().length && !/^\s*$/.test(nameVal);
            if (isValid) {
                this.submitForm({
                    "name": nameVal.trim(),
                    "description": descriptionVal.trim() || null
                })
            } else alert("Please fill * marked fields");
        });
    }

    submitForm = (reqBody) => {
        this.patchApi(reqBody, this.authHeader, `projects/output?project_id=${this.projectId}&outcome_id=${this.outcomeId}&output_id=${this.outputId}`)
            .then(response => {
                if (response.success) {
                    alert(response.message);
                    window.location.replace(`manage_outputs.html?project_id=${this.projectId}&outcome_id=${this.outcomeId}`)
                }
            })
            .catch(err => {
                console.error(err);
                if (err.status == 401) alert("Session expired, please login");
                else alert(err.responseJSON.message);
            })
            .finally(() => this.stopWaiting())
    }

    onLogoutClick = () => {
        document.cookie = `userEmail=null`;
        document.cookie = `jwt=null`;
        document.cookie = `isLoggedIn=false`;
        document.cookie = `userRoleId=null`;
        document.cookie = `initialCountryId=null`;
        alert("Logged out successfully");
        window.location.replace("mande_tool.html");
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

    patchApi = (reqBody, reqHead, path) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "PATCH",
                "headers": reqHead,
                "data": reqBody,
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