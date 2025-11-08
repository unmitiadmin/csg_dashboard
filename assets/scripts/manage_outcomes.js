$(window).on("load", () => {
    let countryId = parseInt(getCookies(document.cookie).countryId) || parseInt(getCookies(document.cookie).initialCountryId);
    const urlObject = new URL(window.location.href);
    const params = Array.from(urlObject.searchParams.keys()).map(a => {
        let result = {};
        result[a] = urlObject.searchParams.get(a);
        return result;
    }).reduce((a, b) => Object.assign(a, b), {});
    let manageOutcomes = new ManageOutcomes(countryId, params)
    manageOutcomes.init();
})

class ManageOutcomes {
    constructor(countryId, params) {
        this.countryId = countryId
        this.projectId = params.project_id;
        this.apiUrl = apiUrl;

        this.cookieObject = getCookies(document.cookie);
        this.jwt = this.cookieObject.jwt;
        this.userEmail = this.cookieObject.userEmail;
        this.isLoggedIn = this.cookieObject.isLoggedIn;
        this.userRoleId = this.cookieObject.userRoleId;
        this.authHeader = { "Authorization": this.jwt };
        this.logoutLink = $("a#link-logout");
        this.userMgmtLink = $("li#user-management-link");
        this.loggedInUserEmailLabel = $("li#user-email-label");

        this.outcomeList = [];
        this.searchOutcomeText = $("input[type='text']#search-outcome-text");
        this.labelProjectName = $("li#breadcrumb-project-name");
        this.labelStaticProjectId = $("span#static-project-id");
        this.addOutcomeShortcut = $("a#shortcut-add-outcome");

        this.statusIcons = {
            "Pending": `<i class="fa fa-2x fa-question-circle-o text-warning" aria-hidden="true"></i>`,
            "Approved": `<i class="fa fa-2x fa-check-circle-o text-success" aria-hidden="true"></i>`,
            "Rejected": `<i class="fa fa-2x fa-times-circle-o text-danger" aria-hidden="true"></i>`
        };

        this.divCounts = $("div#div-counts-status");
        this.divButtonActions = $("div#btns-outcome-popup");
        this.selectedOutcomeIds = [];
        this.userActionAllowed = this.userRoleId <= 2;
        this.btnBulkDelete = $("button#btn-bulk-delete");
        this.btnBulkApprove = $("button#btn-bulk-approve");
        this.btnBulkReject = $("button#btn-bulk-reject");
    }

    init = () => {
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.userRole
        this.logoutLink.on("click", this.onLogoutClick);
        if (this.isLoggedIn) {
            this.fetchData();
        } else {
            this.pageAlert("Please log in", 0);
            setTimeout(() => window.location.replace("index.html"), 1000);
        }
    }

    fetchData = () => {
        Promise.all([
            this.getApi(this.authHeader, `projects/outcome?project_id=${this.projectId}`),
            this.getApi(this.authHeader, `projects/manage?project_id=${this.projectId}`)
        ])
            .then(([outcomeResponse, detailsResponse]) => {
                if (outcomeResponse.success && detailsResponse.success) {
                    this.labelProjectName.empty().html(detailsResponse.data.project_name);
                    this.labelStaticProjectId.empty().html(detailsResponse.data.project_id);
                    this.addOutcomeShortcut.attr("href", `add_outcome.html?project_id=${detailsResponse.data.project_id}`);
                    this.outcomeList = outcomeResponse.data;
                    this.fillTable(outcomeResponse.data);
                    this.displayCounts(outcomeResponse.counts);
                } else this.pageAlert("Unable to get data", 0);
            })
            .then(() => this.bindSearch())
            .then(() => this.enableDeletion())
            .then(() => this.enableBulkActions())
            .then(() => {
                if(this.userActionAllowed){
                    $("input[type='checkbox'][name='check_outcome_id']").on("click", () => {
                        let checkedBoxes = $("input[type='checkbox'][name='check_outcome_id']:checked");
                        this.selectedOutcomeIds = checkedBoxes.map((_, checkbox) => Number($(checkbox).val())).get();
                        let allChecked = checkedBoxes.length === $("input[type='checkbox'][name='check_outcome_id']").length;
                        $("input[type='checkbox']#check_outcome_ids").prop("checked", allChecked);
                        this.togglePopupActionButtons();
                    });
                    $("input[type='checkbox']#check_outcome_ids").on("click", () => {
                        let parentCheck = $("input[type='checkbox']#check_outcome_ids").prop("checked");
                        $("input[type='checkbox'][name='check_outcome_id']").prop("checked", parentCheck);
                        let checkedBoxes = $("input[type='checkbox'][name='check_outcome_id']:checked");
                        this.selectedOutcomeIds = checkedBoxes.map((_, checkbox) => Number($(checkbox).val())).get();
                        this.togglePopupActionButtons();
                    });
                }
            })
            .catch(err => {
                console.error(err);
                if (err.status == 401) {
                    this.pageAlert("Session expired, please login", 0);
                    setTimeout(() => window.location.replace("index.html"), 1000);
                } else this.pageAlert("Unable to get data", 0);
            })
            .finally(() => this.stopWaiting())
    }

    displayCounts = (counts) => {
        if(counts.Total){
            let countsHtml = `<div class="d-flex mt-2 mb-2 align-items-center">
                <div class="upload-text" id="total_surveys">
                    <h4>Total Submissions: ${counts.Total}</h4>
                </div>
                <div class="border-right line mx-2"></div>
                <div class="pending-text" id="pending_surveys">
                    <h4>Pending: ${counts.Pending}</h4>
                </div>
                <div class="border-right line mx-2"></div>
                <div class="approved-text" id="approved_surveys">
                    <h4>Approved: ${counts.Approved}</h4>
                </div>
                <div class="border-right line mx-2"></div>
                <div class="reject-text" id="rejected_surveys">
                    <h4>Rejected: ${counts.Rejected}</h4>
                </div>
            </div>`;
            this.divCounts.empty().html(countsHtml);
        } else this.divCounts.empty();
    }

    togglePopupActionButtons = () => {
        if(this.userActionAllowed && this.selectedOutcomeIds.length){
            this.divButtonActions.empty().html(`
                <div class="d-flex mt-2 mb-2 align-items-center justify-content-end AllBtns">
                    <button type="button" class="btn btn-sm btn-success verify ml-2" data-toggle="modal" data-target="#myModalApprove">Approve</button>
                    <button type="button" class="btn btn-sm btn-danger verify ml-2" data-toggle="modal" data-target="#myModalReject">Reject</button>
                    <button type="button" class="btn btn-sm btn-danger delete ml-2" data-toggle="modal"  data-target="#myModalDelete">Delete</button>
                </div>
            `)
        } else this.divButtonActions.empty();
    }

    fillTable = (mainList) => {
        let headParentCheckbox = this.userActionAllowed ? `<th><input type="checkbox" class="ShowHide" id="check_outcome_ids"></th>` : ""
        let tHead = `<tr>
            ${headParentCheckbox}
            <th>S.No</th>
            <th>Verification Status</th>
            <th>Outcome</th>
            <th>Description</th>
            <th>Added By</th>
            <th>Added On</th>
            <th>Action</th>
        </tr>`;
        $("thead#thead-outcome").empty().html(tHead);

        let tBody = mainList.map((a, i) => {
            let bodyChildCheckbox = this.userActionAllowed 
                ? `<td><input type="checkbox" class="ShowHide" value="${a.outcome_id}" name="check_outcome_id"></td>`
                : "";
            return `<tr>
                ${bodyChildCheckbox}
                <td>${i+1}</td>
                <td title="${a.approval_status}">${this.statusIcons[a.approval_status]}</td>
                <td>${a.outcome}</td>
                <td>${a.description ?? "N/A"}</td>
                <td>${a.added_by_user}</td>
                <td>${a.added_on}</td>
                <td>
                    <div class="d-flex justify-content-start align-items-center flex-wrap">
                        <a role="button" href="edit_outcome.html?project_id=${this.projectId}&outcome_id=${a.outcome_id}">
                            <button class="btn btn-white-rounded text-dark me-3">
                                Edit <span><img src="./assets/images/Edit_Pencil_01.svg"></span>
                            </button>
                        </a>
                        <a role="button" class="btn_outcome_delete" data-project-id="${this.projectId}" data-outcome-id="${a.outcome_id}" data-outcome-name="${a.outcome}">
                            <button class="btn btn-white-rounded text-dark me-3">
                                Delete <span><img src="./assets/images/Trash_Full.svg"></span>
                            </button>
                        </a>
                        <a role="button" href="manage_outputs.html?project_id=${this.projectId}&outcome_id=${a.outcome_id}">
                            <button class="btn btn-white-rounded text-dark me-3">
                                Manage Outputs <span><img src="./assets/images/view-report-dark.svg"></span>
                            </button>
                        </a>
                    </div>
                </td>
            </tr>`;
        }).join("\n");

        $("tbody#tbody-outcome").empty().html(tBody);
    }

    enableDeletion = () => {
        $("a.btn_outcome_delete").unbind("click").on("click", (event) => {
            let outcomeId = $(event.currentTarget).data("outcome-id");
            // let projectId = $(event.currentTarget).data("project-id");
            let outcomeName = $(event.currentTarget).data("outcome-name");
            $("#deletion-confirmation-modal").modal("show");
            $("#deletion-confirmation-modal .modal-body").html(`
                Are you sure you want to delete this outcome? <br /><b>${outcomeName}</b>
            `);
            $(".btn-confirm-delete").data("outcome-id", outcomeId).on("click", () => {
                let outcomeIdToDelete = $(event.currentTarget).data("outcome-id");
                let projectIdToDelete = $(event.currentTarget).data("project-id");
                this.deleteOutcome(projectIdToDelete, outcomeIdToDelete);
                $("#deletion-confirmation-modal").modal("hide");
            });
        });
    }

    deleteOutcome = (projectId, outcomeId) => {
        this.deleteApi(this.authHeader, `projects/outcome?project_id=${projectId}&outcome_id=${outcomeId}`)
            .then(response => {
                if (response.success) {
                    this.pageAlert(response.message, 1);
                    window.location.reload();
                } else this.pageAlert("Unable to delete outcome", 0);
            })
            .catch(err => {
                console.error(err);
                if (err.status == 401) {
                    this.pageAlert("Session expired, please login", 0);
                    setTimeout(() => window.location.replace("index.html"), 1000);
                } else this.pageAlert("Unable to get data", 0);
            })
            .finally(() => this.stopWaiting())
    }

    enableBulkActions = () => {
        this.enableBulkApprove();
        this.enableBulkReject();
        this.enableBulkDelete();
    }

    enableBulkApprove = () => {
        this.btnBulkApprove.on("click", () => {
            let reqBody = {
                "purpose": "approve",
                "record_type": "outcome",
                "outcome_ids": JSON.stringify(this.selectedOutcomeIds),
                "reason": null,
            }
            this.patchApi(reqBody, this.authHeader, `projects/approval`)
            .then(response => {
                console.log(response);
                this.pageAlert(response.message, 1);
                setTimeout(() => window.location.reload(), 1000);
            })
            .catch(err => {
                console.log(err)
                this.pageAlert("Unable to approve the outcomes", 0)
            })
            .finally(() => {
                $("#myModalApprove").modal("hide");
                this.stopWaiting();
            });
        })
    }


    enableBulkReject = () => {
        this.btnBulkReject.on("click", () => {
            let reqBody = {
                "purpose": "reject",
                "record_type": "outcome",
                "outcome_ids": JSON.stringify(this.selectedOutcomeIds),
                "reason": $("textarea#text-bulk-reject").val(),
            }
            this.patchApi(reqBody, this.authHeader, `projects/approval`)
            .then(response => {
                console.log(response)
                this.pageAlert(response.message, 1);
                setTimeout(() => window.location.reload(), 1000);
            })
            .catch(err => {
                console.log(err);
                this.pageAlert("Unable to reject the outcomes", 0)
            })
            .finally(() => {
                $("#myModalReject").modal("hide");
                this.stopWaiting();
            });
        });
    }

    enableBulkDelete = () => {
        this.btnBulkDelete.on("click", () => {
            let reqBody = {
                "purpose": "delete",
                "record_type": "outcome",
                "outcome_ids": JSON.stringify(this.selectedOutcomeIds),
                "reason": $("textarea#text-bulk-delete").val(),
            }
            this.patchApi(reqBody, this.authHeader, `projects/approval`)
            .then(response => {
                console.log(response);
                this.pageAlert(response.message, 1);
                setTimeout(() => window.location.reload(), 1000);
            })
            .catch(err => {
                console.log(err);
                this.pageAlert("Unable to delete the outcomes", 0)
            })
            .finally(() => {
                $("#myModalDelete").modal("hide");
                this.stopWaiting();
            });
        })
    }


    bindSearch = () => {
        this.searchOutcomeText.unbind("input")
            .on("input", e => {
                let searchText = e.currentTarget.value;
                let filteredList = this.outcomeList.filter(a =>
                    String(a.outcome).toLocaleLowerCase().includes(searchText.toLocaleLowerCase())
                    || String(a.description).toLocaleLowerCase().includes(searchText.toLocaleLowerCase())
                );
                this.fillTable(filteredList);
                this.enableDeletion();
            })
    }

    onLogoutClick = () => {
        document.cookie = `userEmail=null`;
        document.cookie = `jwt=null`;
        document.cookie = `isLoggedIn=false`;
        this.pageAlert("Logged out successfully", 1);
        setTimeout(() => window.location.replace("index.html"), 1000);
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

    patchApi = (reqBody, reqHead, path) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "PATCH",
                "headers": {...reqHead},
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