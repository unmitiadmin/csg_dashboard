$(window).on("load", () => {
    let countryId = parseInt(getCookies(document.cookie).countryId) || parseInt(getCookies(document.cookie).initialCountryId);
    const urlObject = new URL(window.location.href);
    const params = Array.from(urlObject.searchParams.keys()).map(a => {
        let result = {};
        result[a] = urlObject.searchParams.get(a);
        return result;
    }).reduce((a, b) => Object.assign(a, b), {});
    let addReport = new AddReport(countryId, params);
    addReport.init();
});

class AddReport {
    constructor(countryId, params) {
        this.apiUrl = apiUrl;
        this.countryId = countryId;
        this.projectId = params.project_id;

        this.cookieObject = getCookies(document.cookie);
        this.jwt = this.cookieObject.jwt;
        this.userEmail = this.cookieObject.userEmail;
        this.isLoggedIn = this.cookieObject.isLoggedIn;
        this.userRoleId = this.cookieObject.userRoleId;
        this.authHeader = { "Authorization": this.jwt };
        this.logoutLink = $("a#link-logout");
        this.userMgmtLink = $("li#user-management-link");
        this.loggedInUserEmailLabel = $("li#user-email-label");

        this.filterYear = $("select#input_year");
        this.filterQuarter = $("select#input_quarter");
        this.filterAttrContr = $("select#input_attrcontr");
        this.filterOutcome = $("select#input_outcome");
        this.filterOutput = $("select#input_output");
        this.inputReportFile = $("input[type='file']#input_report");

        this.buttonSave = $("button#save_report");
        this.buttonCancel = $("button#cancel_report");

        this.labelProjectName = $("li#breadcrumb-project-name");
        this.emptyOption = `<option value="">----</option>\n`;
        this.yearsArray = Array.from({ length: 71 }, (_, index) => 1980 + index);
        this.currentYear = new Date().getFullYear();
    }

    init = () => {
        this.getApi(this.authHeader, "auth/self")
            .then(response => {
                if (response.data.role_id <= 5) this.execute();
                else {
                    this.pageAlert("You are unauthorized to add a report", 0);
                    setTimeout(() => window.location.replace("index.html"), 1000);
                }
            })
            .catch(err => {
                console.error(err);
                this.pageAlert("You are unauthorized to add a report", 0);
                setTimeout(() => window.location.replace("index.html"), 1000);
            })
            .finally(this.stopWaiting);
    }

    execute = () => {
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.logoutLink.on("click", this.onLogoutClick);
        if (this.isLoggedIn) {
            this.fetchData();
        } else {
            this.pageAlert("Please log in", 0);
            setTimeout(() => window.location.replace("index.html"), 1000);
        }
    }

    onLogoutClick = () => {
        document.cookie = `userEmail=null`;
        document.cookie = `jwt=null`;
        document.cookie = `isLoggedIn=false`;
        document.cookie = `userRoleId=null`;
        document.cookie = `initialCountryId=null`;
        this.pageAlert("Logged out successfully", 0);
        setTimeout(() => window.location.replace("index.html"), 1000);;
    }

    fetchData = () => {
        Promise.all([
            this.getApi(this.authHeader, `projects/manage?project_id=${this.projectId}`),
            this.getApi(this.authHeader, `projects/outcome?project_id=${this.projectId}`)
        ])
            .then(([detailsResponse, outcomeResponse]) => {
                let projectReportListPage = `<a href="view_reports.html?project_id=${detailsResponse.data.project_id}">${detailsResponse.data.project_name}</a>`
                this.labelProjectName.empty().html(projectReportListPage);
                this.filterYear.empty().html(this.yearsArray.map(year => `<option value="${year}">${year}</option>`).join("\n"));
                this.filterYear.val(this.currentYear);
                this.filterOutcome.empty().html(outcomeResponse.data.map(a => `<option value="${a.outcome_id}">${a.outcome}</a>`).join("\n"))
            })
            .then(() => {
                this.filterOutcome.unbind("change").on("change", () => {
                    this.fetchOutputs(this.filterOutcome.val())
                }).trigger("change");
            })
            .then(() => this.enableSubmit())
            .catch(err => {
                this.pageAlert("Unable to get options' list from project lookups", 0);
                console.error(err)
            })
            .finally(this.stopWaiting);
    }

    fetchOutputs = (outcomeId) => {
        this.getApi(this.authHeader, `projects/output?project_id=${this.projectId}&outcome_id=${outcomeId}`)
            .then(response => {
                if (response.data.length && response.success) {
                    this.filterOutput.empty().html(response.data.map(a => `<option value="${a.output_id}">${a.output}</a>`).join("\n"));
                } else {
                    this.filterOutput.empty();
                    this.pageAlert("No outputs available under selected outcome", 0)
                }
            })
            .catch(err => {
                this.pageAlert("Unable to get options' list from project lookups", 0);
                console.error(err)
            })
            .finally(this.stopWaiting);
    }

    enableSubmit = () => {
        this.buttonSave.unbind("click").on("click", () => {
            let inputFile = this.inputReportFile[0].files[0];
            let reqBody = new FormData();
            reqBody.append("attachment", inputFile || null);
            reqBody.append("year", this.filterYear.val() || null);
            reqBody.append("quarter", this.filterQuarter.val());
            reqBody.append("attribution_or_contribution", this.filterAttrContr.val());
            reqBody.append("outcome_id", this.filterOutcome.val() || null);
            reqBody.append("output_id", this.filterOutput.val() || null);

            if (reqBody.get("outcome_id") && reqBody.get("output_id") && inputFile) {
                this.submitForm(reqBody)
            } else this.pageAlert("Please fill the required fields", 0);
        })
    }

    submitForm = (reqBody) => {
        this.postWithFile(this.authHeader, reqBody, `projects/report?project_id=${this.projectId}`)
            .then(response => {
                this.pageAlert(response.message, 1);
                setTimeout(() => window.location.replace(`view_reports.html?project_id=${this.projectId}`), 1000);
            })
            .catch(err => {
                this.pageAlert("Unable to save report", 0);
                console.error(err)
            })
            .finally(this.stopWaiting);

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