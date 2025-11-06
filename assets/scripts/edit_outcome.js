$(window).on("load", () => {
    let countryId = parseInt(getCookies(document.cookie).countryId) || parseInt(getCookies(document.cookie).initialCountryId);
    const urlObject = new URL(window.location.href);
    const params = Array.from(urlObject.searchParams.keys()).map(a => {
        let result = {};
        result[a] = urlObject.searchParams.get(a);
        return result;
    }).reduce((a, b) => Object.assign(a, b), {});
    let addOutcome = new EditOutcome(countryId, params);
    addOutcome.init();
});

class EditOutcome {
    constructor(countryId, params) {
        this.countryId = countryId
        this.projectId = params.project_id;
        this.outcomeId = params.outcome_id;
        this.apiUrl = apiUrl;

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

        this.labelProjectName = $("li#breadcrumb-project-name");
        this.labelOutcomeName = $("li#breadcrumb-outcome-name");
        this.labelStaticProjectId = $("span#static-project-id");

        this.inputNameField = $("input#input_outcome_name");
        this.inputDescriptionField = $("textarea#input_outcome_description");
        this.buttonCancelAdding = $("button#cancel_edit_outcome");
        this.buttonSaveNewOutcome = $("button#save_edit_outcome");

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
            if (response.data.role_id <= 3) this.execute();
            else {
                this.pageAlert("You are unauthorized to edit this outcome", 0);
                setTimeout(() => window.location.replace("index.html"), 1000);
            }
        })
        .catch(err => {
            console.error(err);
            this.pageAlert("You are unauthorized to edit this outcome", 0);
            setTimeout(() => window.location.replace("index.html"), 1000);
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
            this.pageAlert("Please login", 0);
            this.userCountryIcon.attr("src", null).attr("title", null).hide();
            setTimeout(() => window.location.replace("mande_tool.html"), 1000);
        }
    }

    fetchData = () => {
        Promise.all([
            this.getApi(this.authHeader, `projects/manage?project_id=${this.projectId}`),
            this.getApi(this.authHeader, `projects/outcome?project_id=${this.projectId}&outcome_id=${this.outcomeId}`)
        ])
            .then(([detailsResponse, outcomeResponse]) => {
                if (detailsResponse.success && outcomeResponse.success) {
                    let manageViewPage = `<a href="manage_outcomes.html?project_id=${detailsResponse.data.project_id}">${detailsResponse.data.project_name}</a>`
                    this.labelProjectName.empty().html(manageViewPage);
                    this.labelOutcomeName.empty().html(outcomeResponse.data.outcome);
                    this.labelStaticProjectId.empty().html(detailsResponse.data.project_id);
                    this.inputNameField.val(outcomeResponse.data.outcome);
                    this.inputDescriptionField.val(outcomeResponse.data.description);
                    this.enableForm();
                }
            })
            .catch(err => {
                console.error(err);
                if (err.status == 401){
                     this.pageAlert("Session expired, please login", 0)
                     setTimeout(() => window.location.replace("mande_tool.html"), 1000);  
                } else this.pageAlert("Unable to get data", 0);
            })
            .finally(() => this.stopWaiting())
    }

    enableForm = () => {
        this.buttonSaveNewOutcome.unbind("click").on("click", () => {
            let nameVal = this.inputNameField.val();
            let descriptionVal = this.inputDescriptionField.val();

            let isValid = nameVal.trim().length && !/^\s*$/.test(nameVal);
            if (isValid) {
                this.submitForm({
                    "name": nameVal.trim(),
                    "description": descriptionVal.trim() || null
                })
            } else this.pageAlert("Please fill * marked fields", 0);
        });
    }

    submitForm = (reqBody) => {
        this.patchApi(reqBody, this.authHeader, `projects/outcome?project_id=${this.projectId}&outcome_id=${this.outcomeId}`)
            .then(response => {
                if (response.success) {
                    this.pageAlert(response.message, 1);
                    setTimeout(() => window.location.replace(`manage_outcomes.html?project_id=${this.projectId}`), 1000)
                }
            })
            .catch(err => {
                console.error(err);
                if (err.status == 401){ 
                    this.pageAlert("Session expired, please login", 0);
                    setTimeout(() => window.location.replace("mande_tool.html"), 1000);
                }
                else this.pageAlert(err.responseJSON.message, 0);
            })
            .finally(() => this.stopWaiting())
    }

    onLogoutClick = () => {
        document.cookie = `userEmail=null`;
        document.cookie = `jwt=null`;
        document.cookie = `isLoggedIn=false`;
        document.cookie = `userRoleId=null`;
        document.cookie = `initialCountryId=null`;
        this.pageAlert("Logged out successfully");
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