$(window).on("load", () => {
    let countryId = parseInt(getCookies(document.cookie).countryId) || parseInt(getCookies(document.cookie).initialCountryId);
    let mandeTool = new MandETool(countryId);
    mandeTool.init();
});

class MandETool {
    constructor(countryId) {
        this.countryId = countryId;
        this.filterCountry = $("select#filter-country");
        this.selectedCountryId = this.filterCountry.val();

        this.apiUrl = apiUrl;
        this.lookupsReqBody = lookupsReqBody;

        this.cookieObject = getCookies(document.cookie);
        this.jwt = this.cookieObject.jwt;
        this.userEmail = this.cookieObject.userEmail;
        this.emailVerified = 0;
        this.isLoggedIn = this.cookieObject.isLoggedIn;
        this.userRoleId = this.cookieObject.userRoleId;
        this.initialCountryId = this.cookieObject.initialCountryId;
        this.authHeader = { "Authorization": this.jwt };
        this.logoutLink = $("a#link-logout");
        this.userMgmtLink = $("li#user-management-link");
        this.loggedInUserEmailLabel = $("li#user-email-label");
        this.userCountryIcon = $("img#user-country-icon");
        this.linksManagement = $("div#links-manage-projects");

        this.categories = [
            { "id": 1, "category": "Adaptation", "label": "adaptation" },
            { "id": 2, "category": "Mitigation", "label": "mitigation" },
            { "id": 3, "category": "Cross-cutting", "label": "crosscutting" },
        ];
        this.sectors = [];

        this.projectList = [];
        this.searchProjectText = $("input[type='text']#search-project-text");

        this.inputImgBannerFile = $("input[type='file']#input-project-banner");
        this.submitImgBannerFile = $("button#submit-project-banner");
    }


    init = () => {
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        this.logoutLink.on("click", this.onLogoutClick);
        // this.userRoleId == 1 ? this.filterCountry.show() : this.filterCountry.hide();
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.filterCountry.on("change", () => {
            this.selectedCountryId = this.filterCountry.val();
            (this.userRoleId != 1 && (this.initialCountryId == this.selectedCountryId)) || this.userRoleId == 1
                ? this.linksManagement.show() : this.linksManagement.hide();
            this.countryId = this.selectedCountryId;
            document.cookie = `countryId=${this.selectedCountryId}`;
            this.execute();
        });
        this.userRoleId != 1
            ? this.filterCountry.val(this.initialCountryId).trigger("change")
            : this.filterCountry.val(this.countryId).trigger("change");
    }

    execute = () => {
        if (this.isLoggedIn) {
            this.countryId
                ? (this.userRoleId != 1
                    ? this.userCountryIcon.attr("src", `./assets/flag_icons/${this.initialCountryId}.png`).show()
                    : this.userCountryIcon.attr("src", null).hide())
                : this.userCountryIcon.attr("src", null).hide();
            if (this.countryId) this.fetchData();
            else {
                $("select#filter-country option:first").prop("selected", true).trigger("change");
                this.countryId = $("select#filter-country").val();
                this.fetchData();
            }
        } else {
            this.userCountryIcon.attr("src", null).hide();
        }
    }

    fetchData = () => {
        Promise.all([
            this.postApi(this.lookupsReqBody, {}, "projects/lookups"),
            this.getApi(this.authHeader, `projects/list?country_id=${this.countryId}`),
            this.getApi(this.authHeader, `auth/self`)
        ])
            .then(([lkpResponse, response, userSelf]) => {
                if (lkpResponse.success && response.success && userSelf.success) {
                    this.emailVerified = userSelf.data.verified;
                    this.userRoleId = userSelf.data.role_id;
                    let mainList = response.data.page_list.map(a => {
                        this.sectors = lkpResponse.data.find(b => b.table == "sector").lookup_data;
                        return {
                            "project_id": a.id,
                            "name": a.project_name.replace(/�/g, ""),
                            "categories": a.category
                                ? a.category.map(b => this.categories.find(c => c.id == b))
                                : [{ "category": "Unavailable", "label": "secondary" }],
                            "sectors": a.sector
                                ? this.sectors.filter(b => a.sector.includes(b.id))
                                : null,
                            "start_year": a.start_year,
                            "end_year": a.end_year,
                            "current_status": a.current_status,
                            "banner_image": a.banner_image,
                            "count_outcomes": a.count_outcomes,
                            "count_outputs": a.count_outputs,
                            "count_reports": a.count_reports,
                            "outcomes_breakup": a.outcomes_breakup,
                            "outputs_breakup": a.outputs_breakup,
                            "reports_breakup": a.reports_breakup,
                        }
                    });
                    this.projectList = mainList;
                    this.fillTable(mainList);
                    this.fillCards(mainList);
                } else this.pageAlert("Unable to get data", 0);
            })
            .then(() => this.bindSearch())
            .then(() => this.enableDeletion())
            .then(() => this.enableBannerEdit())
            .catch(err => {
                console.error(err);
                this.pageAlert(err.responseJSON.message, 0);
                if (err.status == 401) {
                    setTimeout(() => this.onLogoutClick(), 1000);
                }
            })
            .finally(() => this.stopWaiting())
    }

    fillCards = (mainList) => {
        let mainHtml = mainList.map(a => {
            let sectors = a.sectors.length ? a.sectors.map(b => {
                return `<button class="btn btn-sm btn-mande btn-success text-white mr-1">${b.sector}</button>`
            }).join("") : `<button class="btn btn-sm btn-mande btn-secondary text-white">Unclassified sector</button>`;
            let category = a.categories.map(b => {
                return `
                    <div> <button class="btn btn-sm btn-mande btn-${b.label}">${b.category}</button></div>
                `
            }).join("");
            let reportsListShortcut = a.count_outputs && (
                this.userRoleId == 1 || (this.userRoleId <= 3 && this.initialCountryId == this.selectedCountryId && this.emailVerified)
            )? ` <a href="view_reports.html?project_id=${a.project_id}">
                    <button class="btn btn btn-mande">
                        Progress/View Report
                        <span><img src="./assets/images/view-report.svg"></span>
                    </button>
                </a>

            ` : ``;
            let reportCounts = `<div class="d-flex justify-content-between align-items-center my-3">
                <div> <h5>Total Submission</h5> <h6>${a.reports_breakup.Total}</h6> </div>
                <div> <h5>Pending</h5> <h6>${a.reports_breakup.Pending}</h6> </div>
                <div> <h5>Approved</h5> <h6>${a.reports_breakup.Approved}</h6> </div>
                <div> <h5>Rejected</h5> <h6>${a.reports_breakup.Rejected}</h6> </div>
            </div>`;

            let projectOptions = this.userRoleId == 1 || (this.userRoleId <= 2 && this.initialCountryId == this.selectedCountryId && this.emailVerified)
                ? `
                    <a href="edit_project.html?project_id=${a.project_id}" style="">
                        <button class="btn btn-white-rounded btn-mande me-3">
                             Modify
                        </button>
                    </a>
                    <a class="btn_project_delete" data-project-id="${a.project_id}" data-project-name="${a.name}">
                        <button class="btn btn-white-rounded btn-mande me-3">
                            Delete
                        </button>
                    </a>
                `: "";
                
            let outcomeShortcut =
                this.userRoleId == 1
                    || (this.userRoleId <= 3 && this.initialCountryId == this.selectedCountryId && this.emailVerified)
                    ? `    <a href="manage_outcomes.html?project_id=${a.project_id}">
                    <button class="btn btn-white-rounded btn-mande">
                    Add or modify Project Outcomes 
                        <span><img src="./assets/images/view-report.svg"></span>
                    </button>
                </a>`: "";
            let bannerLink = this.apiUrl == "http://localhost:8000"
                ? `${this.apiUrl}/clima_adapt_api/media/project_banners/${a.banner_image}`
                : `${this.apiUrl}/clima_adapt_media/project_banners/${a.banner_image}`;
            let bannerChangeOption =
                this.userRoleId == 1
                    || (this.userRoleId <= 2 && (this.initialCountryId == this.selectedCountryId) && this.emailVerified)
                    ? `<div class="btn btn-mande btn-sm btn-success btn-change-banner"
                            title="Edit project banner" data-project-id="${a.project_id}" data-project-name="${a.name}">
                            <span><i class="fa fa-edit text-white"></i></span>
                        </div>`
                    : "";
            return `<div class="col-sm-12 col-md-4 col-lg-4">
                <div class="card border-0 mb-3 card_new">
                    <div class="card-body">
                        <div class="lightImageBox mb-2"
                            style="
                            background: linear-gradient(0deg, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${bannerLink}');
                            background-size: cover;
                            background-position: bottom;
                            background-repeat: no-repeat;
                        "></div>
                        <div class="d-flex justify-content-between align-items-center">
                            ${category}
                            ${bannerChangeOption}
                        </div>
                        <div class="mb-3">${sectors}</div>
                        <div><b>${a.name}</b></div>
                        <div class="d-flex justify-content-between align-items-center class="mt-1"">
                            ${projectOptions}
                            ${outcomeShortcut}
                        </div>
                        <div class="mt-1">${reportCounts}</div>
                    </div>
                </div>
            </div>`;
        }).join("\n");
        $("div#cards-projects").empty().html(mainHtml);
    }


    enableBannerEdit = () => {
        $("div.btn-change-banner").unbind("click").on("click", event => {
            debugger;
            let projectId = $(event.currentTarget).data("project-id");
            let projectName = $(event.currentTarget).data("project-name");
            $("#edit-banner-modal").modal("show");
            $("button#submit-project-banner").data("project-id", projectId).on("click", () => {
                let projectIdBannerToUpdate = $(event.currentTarget).data("project-id");
                let inputFile = this.inputImgBannerFile[0].files[0]
                let reqBody = new FormData();
                reqBody.append("attachment", inputFile || null);
                reqBody.append("sampleKey", "sampleValue");
                debugger;
                this.updateBanner(projectIdBannerToUpdate, reqBody);
                $("#edit-banner-modal").modal("hide");
            })
        })
    }

    updateBanner = (projectId, reqBody) => {
        this.patchWithFile(this.authHeader, reqBody, `projects/banner?project_id=${projectId}`)
            .then(response => {
                if (response.success) {
                    this.pageAlert(response.message, 1);
                    setTimeout(() => window.location.reload(), 1000);
                    // this.fetchData();
                }
            })
            .catch(err => {
                console.error(err);
                this.pageAlert(err.responseJSON.message, 0);
                if (err.status == 401) {
                    this.onLogoutClick()
                    setTimeout(() => this.onLogoutClick(), 1000);
                }
            })
            .finally(() => this.stopWaiting())
    }

    enableDeletion = () => {
        $("a.btn_project_delete").unbind("click").on("click", (event) => {
            let projectId = $(event.currentTarget).data("project-id");
            let projectName = $(event.currentTarget).data("project-name");
            $("#deletion-confirmation-modal").modal("show");
            $("#deletion-confirmation-modal .modal-body").html(`
                Are you sure you want to delete the project? <br /><b>${projectName}</b>
            `);
            $(".btn-confirm-delete").data("project-id", projectId).on("click", () => {
                let projectIdToDelete = $(event.currentTarget).data("project-id");
                this.deleteProject(projectIdToDelete);
                $("#deletion-confirmation-modal").modal("hide");
            });
        });
    }

    deleteProject = (projectId) => {
        this.deleteApi(this.authHeader, `projects/manage?project_id=${projectId}`)
            .then(response => {
                if (response.success) {
                    this.pageAlert(response.message, 1);
                    this.filterCountry.trigger("change");
                    window.location.reload();
                } else this.pageAlert("Unable to delete project");
            })
            .catch(err => {
                console.error(err);
                this.pageAlert(err.responseJSON.message, 0);
                if (err.status == 401) {
                    setTimeout(() => this.onLogoutClick(), 1000);
                }
            })
            .finally(() => this.stopWaiting())
    }


    fillTable = (mainList) => {
        let tBody = mainList.map((a, i) => {
            return `<tr>
                <td>${i + 1}</td>
                <td>${a.name}</td>
                <td>${a.start_year ?? "N/A"}</td>
                <td>${a.end_year ?? "N/A"}</td>
                <td>${a.current_status ?? "N/A"}</td>
                <td>
                    <a role="link" href="project_details.html?projectId=${a.project_id}" style="padding-left: 0px;"><u>View Details</u></a>
                </td>
            </tr>`;
        }).join("\n");

        let table = $("table#table-project");
        table.DataTable().destroy();
        $("tbody#tbody-project").empty().html(tBody);
        table.DataTable({ searching: false }).draw();
    }

    bindSearch = () => {
        this.searchProjectText.unbind("input")
            .on("input", e => {
                let searchText = e.currentTarget.value;
                // let filteredList = this.projectList.filter(a => String(a.name).toLocaleLowerCase().includes(searchText));
                let filteredList = this.projectList.filter(a => String(a.name).replace(/�/g, "").toLocaleLowerCase().includes(String(searchText.replace(/�/g, "")).toLocaleLowerCase()));
                this.fillCards(filteredList);
                this.fillTable(filteredList);
                this.enableDeletion()
            })

    }

    onLogoutClick = () => {
        document.cookie = `userEmail=null`;
        document.cookie = `jwt=null`;
        document.cookie = `isLoggedIn=false`;
        document.cookie = `userRoleId=null`;
        document.cookie = `initialCountryId=null`;
        this.pageAlert("Logged out successfully", 1);
        window.location.replace("index.html");
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

    patchWithFile = (reqHead, reqBody, path) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "PATCH",
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

    deleteApi = (reqHead, path) => {
        console.log(`${this.apiUrl}/${path}`)
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "DELETE",
                "headers": reqHead,
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


