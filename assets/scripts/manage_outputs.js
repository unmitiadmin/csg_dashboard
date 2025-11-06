$(window).on("load", () => {
    let countryId = parseInt(getCookies(document.cookie).countryId) || parseInt(getCookies(document.cookie).initialCountryId);
    const urlObject = new URL(window.location.href);
    const params = Array.from(urlObject.searchParams.keys()).map(a => {
        let result = {};
        result[a] = urlObject.searchParams.get(a);
        return result;
    }).reduce((a, b) => Object.assign(a, b), {});
    let manageOutputs = new ManageOutputs(countryId, params)
    manageOutputs.init();
})

class ManageOutputs {
    constructor(countryId, params) {
        this.countryId = countryId
        this.projectId = params.project_id;
        this.outcomeId = params.outcome_id;
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

        this.outputList = [];
        this.searchOutputText = $("input[type='text']#search-output-text");
        this.labelProjectName = $("li#breadcrumb-project-name");
        this.labelOutcomeName = $("li#breadcrumb-outcome-name");
        this.labelStaticProjectId = $("span#static-project-id");
        this.labelStaticOutcomeId = $("span#static-outcome-id");
        this.addOutputShortcut = $("a#shortcut-add-output");

        this.statusIcons = {
            "Pending": `<i class="fa fa-2x fa-question-circle-o text-warning" aria-hidden="true"></i>`,
            "Approved": `<i class="fa fa-2x fa-check-circle-o text-success" aria-hidden="true"></i>`,
            "Rejected": `<i class="fa fa-2x fa-times-circle-o text-danger" aria-hidden="true"></i>`
        };

        this.divCounts = $("div#div-counts-status");
        this.divButtonActions = $("div#btns-output-popup");
        this.selectedOutputIds = [];
        this.userActionAllowed = this.userRoleId <= 3;
        this.btnBulkDelete = $("button#btn-bulk-delete");
        this.btnBulkApprove = $("button#btn-bulk-approve");
        this.btnBulkReject = $("button#btn-bulk-reject");
    }

    init = () => {
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.logoutLink.on("click", this.onLogoutClick);
        if (this.isLoggedIn) {
            this.fetchData();
        } else {
            this.pageAlert("Please log in", 0);
            setTimeout(() => window.location.replace("index.html"), 2000);
        }
    }

    fetchData = () => {
        Promise.all([
            this.getApi(this.authHeader, `projects/output?project_id=${this.projectId}&outcome_id=${this.outcomeId}`),
            this.getApi(this.authHeader, `projects/outcome?project_id=${this.projectId}&outcome_id=${this.outcomeId}`),
            this.getApi(this.authHeader, `projects/manage?project_id=${this.projectId}`)
        ])
            .then(([outputResponse, outcomeResponse, detailsResponse]) => {
                if (outputResponse.success, outcomeResponse.success && detailsResponse.success) {
                    let outcomesShortcut = `<a href="manage_outcomes.html?project_id=${detailsResponse.data.project_id}&outcome_id=${outcomeResponse.data.outcome_id}">
                    ${detailsResponse.data.project_name}
                </a>`;
                    this.labelProjectName.empty().html(outcomesShortcut);
                    this.labelStaticProjectId.empty().html(detailsResponse.data.project_id);
                    this.labelOutcomeName.empty().html(outcomeResponse.data.outcome);
                    this.labelStaticOutcomeId.empty().html(outcomeResponse.data.outcome_id);
                    this.addOutputShortcut.attr("href", `add_output.html?project_id=${detailsResponse.data.project_id}&outcome_id=${outcomeResponse.data.outcome_id}`);
                    this.outputList = outputResponse.data;
                    this.fillTable(outputResponse.data);
                    this.displayCounts(outputResponse.counts);
                } else this.pageAlert("Unable to get data", 0);
            })
            .then(() => this.bindSearch())
            .then(() => this.enableDeletion())
            .then(() => this.enableBulkActions())
            .then(() => {
                if(this.userActionAllowed){
                    $("input[type='checkbox'][name='check_output_id']").on("click", () => {
                        let checkedBoxes = $("input[type='checkbox'][name='check_output_id']:checked");
                        this.selectedOutputIds = checkedBoxes.map((_, checkbox) => Number($(checkbox).val())).get();
                        let allChecked = checkedBoxes.length === $("input[type='checkbox'][name='check_output_id']").length;
                        $("input[type='checkbox']#check_output_ids").prop("checked", allChecked);
                        this.togglePopupActionButtons();
                    });
                    $("input[type='checkbox']#check_output_ids").on("click", () => {
                        let parentCheck = $("input[type='checkbox']#check_output_ids").prop("checked");
                        $("input[type='checkbox'][name='check_output_id']").prop("checked", parentCheck);
                        let checkedBoxes = $("input[type='checkbox'][name='check_output_id']:checked");
                        this.selectedOutputIds = checkedBoxes.map((_, checkbox) => Number($(checkbox).val())).get();
                        this.togglePopupActionButtons();
                    });
                }
            })
            .catch(err => {
                console.error(err);
                if (err.status == 401) setTimeout(() => this.pageAlert("Session expired, please login", 0), 2000);
                else this.pageAlert("Unable to get data", 0);
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
        if(this.userActionAllowed && this.selectedOutputIds.length){
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
        let headParentCheckbox = this.userActionAllowed ? `<th><input type="checkbox" class="ShowHide" id="check_output_ids"></th>` : ""
        let tHead = `<tr>
            ${headParentCheckbox}
            <th>S.No</th>
            <th>Verification Status</th>
            <th>Outcome</th>
            <th>Output</th>
            <th>Description</th>
            <th>Added By</th>
            <th>Added On</th>
            <th>Action</th>
        </tr>`;
        $("thead#thead-output").empty().html(tHead);

        let tBody = mainList.map((a, i) => {
            let bodyChildCheckbox = this.userActionAllowed 
                ? `<td><input type="checkbox" class="ShowHide" value="${a.output_id}" name="check_output_id"></td>`
                : "";
            return `<tr>
                ${bodyChildCheckbox}
                <td>${i+1}</td>
                <td title="${a.approval_status}">${this.statusIcons[a.approval_status]}</td>
                <td>${a.outcome}</td>
                <td>${a.output}</td>
                <td>${a.description ?? "N/A"}</td>
                <td>${a.added_by_user}</td>
                <td>${a.added_on}</td>
                <td>
                    <div class="d-flex justify-content-start align-items-center flex-wrap">
                        <a role="button" href="edit_output.html?project_id=${this.projectId}&outcome_id=${a.outcome_id}&output_id=${a.output_id}">
                            <button class="btn btn-white-rounded text-dark me-3">
                                Edit <span><img src="./assets/images/Edit_Pencil_01.svg"></span>
                            </button>
                        </a>
                        <a role="button" class="btn_output_delete" data-project-id="${this.projectId}" data-outcome-id="${a.outcome_id}" data-output-id="${a.output_id}" data-output-name="${a.output}">
                            <button class="btn btn-white-rounded text-dark me-3">
                                Delete <span><img src="./assets/images/Trash_Full.svg"></span>
                            </button>
                        </a>
                    </div>
                </td>
            </tr>`;
        }).join("\n");

        $("tbody#tbody-output").empty().html(tBody);
    }

    enableDeletion = () => {
        $("a.btn_output_delete").unbind("click").on("click", (event) => {
            let outputId = $(event.currentTarget).data("output-id");
            // let projectId = $(event.currentTarget).data("project-id");
            let outputName = $(event.currentTarget).data("output-name");
            $("#deletion-confirmation-modal").modal("show");
            $("#deletion-confirmation-modal .modal-body").html(`
                Are you sure you want to delete this output? <br /><b>${outputName}</b>
            `);
            $(".btn-confirm-delete").data("output-id", outputId).on("click", () => {
                let outputIdToDelete = $(event.currentTarget).data("output-id");
                let outcomeIdToDelete = $(event.currentTarget).data("outcome-id");
                let projectIdToDelete = $(event.currentTarget).data("project-id");
                this.deleteOutput(projectIdToDelete, outcomeIdToDelete, outputIdToDelete);
                $("#deletion-confirmation-modal").modal("hide");
            });
        });
    }

    deleteOutput = (projectId, outcomeId, outputId) => {
        this.deleteApi(this.authHeader, `projects/output?project_id=${projectId}&outcome_id=${outcomeId}&output_id=${outputId}`)
            .then(response => {
                if (response.success) {
                    this.pageAlert(response.message, 1);
                    setTimeout(() => window.location.reload(), 1000);
                } else this.pageAlert("Unable to delete output", 0);
            })
            .catch(err => {
                console.error(err);
                if (err.status == 401) this.pageAlert("Session expired, please login", 0);
                else this.pageAlert("Unable to delete output", 0);
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
                "record_type": "output",
                "output_ids": JSON.stringify(this.selectedOutputIds),
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
                this.pageAlert("Unable to approve the outputs", 0)
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
                "record_type": "output",
                "output_ids": JSON.stringify(this.selectedOutputIds),
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
                this.pageAlert("Unable to reject the outputs", 0)
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
                "record_type": "output",
                "output_ids": JSON.stringify(this.selectedOutputIds),
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
                this.pageAlert("Unable to delete the outputs", 0)
            })
            .finally(() => {
                $("#myModalDelete").modal("hide");
                this.stopWaiting();
            });
        })
    }

    bindSearch = () => {
        this.searchOutputText.unbind("input")
            .on("input", e => {
                let searchText = e.currentTarget.value;
                let filteredList = this.outputList.filter(a =>
                    String(a.output).toLocaleLowerCase().includes(searchText.toLocaleLowerCase())
                    || String(a.description).toLocaleLowerCase().includes(searchText.toLocaleLowerCase())
                );
                this.fillTable(filteredList);
                this.enableDeletion();
            })
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

    onLogoutClick = () => {
        document.cookie = `userEmail=null`;
        document.cookie = `jwt=null`;
        document.cookie = `isLoggedIn=false`;
        document.cookie = `userRoleId=null`;
        this.pageAlert("Logged out successfully", 1);
        setTimeout(() => window.location.replace("index.html"), 1000);
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