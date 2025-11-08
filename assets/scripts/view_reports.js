$(window).on("load", () => {
    let countryId = parseInt(getCookies(document.cookie).countryId) || parseInt(getCookies(document.cookie).initialCountryId);
    const urlObject = new URL(window.location.href);
    const params = Array.from(urlObject.searchParams.keys()).map(a => {
        let result = {};
        result[a] = urlObject.searchParams.get(a);
        return result;
    }).reduce((a, b) => Object.assign(a, b), {});
    let viewReports = new ViewReports(countryId, params)
    viewReports.init();
})

class ViewReports {
    constructor(countryId, params) {
        this.countryId = countryId
        this.projectId = params.project_id;
        this.apiUrl = apiUrl;

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

        this.outcomeList = [];
        this.searchOutcomeText = $("input[type='text']#search-outcome-text");
        this.labelProjectName = $("li#breadcrumb-project-name");
        this.labelStaticProjectId = $("span#static-project-id");
        this.addReportShortcut = $("a#shortcut-add-report");

        this.statusIcons = {
            "Pending": `<i class="fa fa-2x fa-question-circle-o text-warning" aria-hidden="true"></i>`,
            "Approved": `<i class="fa fa-2x fa-check-circle-o text-success" aria-hidden="true"></i>`,
            "Rejected": `<i class="fa fa-2x fa-times-circle-o text-danger" aria-hidden="true"></i>`
        };

        this.divCounts = $("div#div-counts-status");
        this.divButtonActions = $("div#btns-report-popup");
        this.selectedReportIds = [];
        this.userActionAllowed = this.userRoleId <= 4;
        this.btnBulkDelete = $("button#btn-bulk-delete");
        this.btnBulkApprove = $("button#btn-bulk-approve");
        this.btnBulkReject = $("button#btn-bulk-reject");
    }

    init = () => {
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        // this.userRoleId == 1 ? this.filterCountry.show() : this.filterCountry.hide();
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.logoutLink.on("click", this.onLogoutClick);
        if (this.isLoggedIn) {
            this.userRoleId != 1
                ? this.userCountryIcon.attr("src", `./assets/flag_icons/${this.initialCountryId}.png`).attr("title", flagIndex[this.initialCountryId]).show()
                : this.userCountryIcon.attr("src", null).attr("title", null).hide();
            this.fetchData();
        } else {
            this.pageAlert("Please log in", 0);
            this.userCountryIcon.attr("src", null).attr("title", null).hide();
            setTimeout(() => window.location.replace("mande_tool.html"), 1000);
        }
    }

    fetchData = () => {
        Promise.all([
            this.getApi(this.authHeader, `projects/manage?project_id=${this.projectId}`),
            this.getApi(this.authHeader, `projects/report?project_id=${this.projectId}`)
        ])
            .then(([detailsResponse, reportsResponse]) => {
                if (detailsResponse.success && reportsResponse.success) {
                    this.labelProjectName.empty().html(detailsResponse.data.project_name);
                    this.addReportShortcut.attr("href", `add_report.html?project_id=${this.projectId}`);
                    this.mainList = reportsResponse.data;
                    this.fillTable(reportsResponse.data);
                    this.displayCounts(reportsResponse.counts);
                }
            })
            .then(() => this.enableDownloadReport())
            .then(() => this.bindSearch())
            .then(() => this.enableBulkActions())
            .then(() => {
                if(this.userActionAllowed){
                    $("input[type='checkbox'][name='check_report_id']").on("click", () => {
                        let checkedBoxes = $("input[type='checkbox'][name='check_report_id']:checked");
                        this.selectedReportIds = checkedBoxes.map((_, checkbox) => Number($(checkbox).val())).get();
                        let allChecked = checkedBoxes.length === $("input[type='checkbox'][name='check_report_id']").length;
                        $("input[type='checkbox']#check_report_ids").prop("checked", allChecked);
                        this.togglePopupActionButtons();
                    });
                    $("input[type='checkbox']#check_report_ids").on("click", () => {
                        let parentCheck = $("input[type='checkbox']#check_report_ids").prop("checked");
                        $("input[type='checkbox'][name='check_report_id']").prop("checked", parentCheck);
                        let checkedBoxes = $("input[type='checkbox'][name='check_report_id']:checked");
                        this.selectedReportIds = checkedBoxes.map((_, checkbox) => Number($(checkbox).val())).get();
                        this.togglePopupActionButtons();
                    });
                }
            })
            .catch(err => {
                console.error(err);
                if (err.status == 401) {
                    this.pageAlert("Session expired, please login", 0);
                    setTimeout(() => window.location.replace("mande_tool.html"), 1000);
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
        if(this.userActionAllowed && this.selectedReportIds.length){
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
        let headParentCheckbox = this.userActionAllowed ? `<th><input type="checkbox" class="ShowHide" id="check_report_ids"></th>` : ""
        let tHead = `<tr>
            ${headParentCheckbox}
            <th>S.No</th>
            <th>Verification Status</th>
            <th>Year</th>
            <th>Quarter</th>
            <th>Attribution/Contribution</th>
            <th>Outcome</th>
            <th>Output</th>
            <th>Added By</th>
            <th>Added On</th>
            <th>Attachment</th>
        </tr>`;
        $("thead#thead-report").empty().html(tHead);

        let tBody = mainList.map((a, i) => {
            let bodyChildCheckbox = this.userActionAllowed 
                ? `<td><input type="checkbox" class="ShowHide" value="${a.report_id}" name="check_report_id"></td>`
                : "";
            return `<tr>
                ${bodyChildCheckbox}
                <td>${i + 1}</td>
                <td title="${a.approval_status}">${this.statusIcons[a.approval_status]}</td>
                <td>${a.year}</td>
                <td>${a.quarter}</td>
                <td>${a.attribution_or_contribution}</td>
                <td>${a.outcome}</td>
                <td>${a.output}</td>
                <td>${a.added_by_user}</td>
                <td>${a.added_on}</td>
                <td>
                    <a type="button" class="download_report" data-project-id="${a.project_id}" data-report-id="${a.report_id}">
                        <img height="18px" width="18px" src="assets/images/pdf.png"/>
                    </a>
                </td>
            </tr>`;
        }).join("\n");

        $("tbody#tbody-report").empty().html(tBody);
    }

    enableDownloadReport = () => {
        $("a.download_report").unbind("click").on("click", e => {
            let currentTarget = $(e.currentTarget);
            this.downloadReport(currentTarget.data("project-id"), currentTarget.data("report-id"))
        })
    }

    downloadReport = (projectId, reportId) => {
        this.getWithFile(this.authHeader, `projects/report?project_id=${projectId}&report_id=${reportId}`)
            .then(responseBlob => {
                const blobUrl = URL.createObjectURL(responseBlob);
                const a = document.createElement("a");
                a.style.display = "none";
                a.href = blobUrl;
                a.download = "report.pdf"; // Set the desired filename
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(blobUrl);
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


    bindSearch = () => {
        this.searchOutcomeText.unbind("input")
            .on("input", e => {
                let searchText = e.currentTarget.value;
                let filteredList = this.outcomeList.filter(a =>
                    String(a.outcome).toLocaleLowerCase().includes(searchText.toLocaleLowerCase())
                    || String(a.output).toLocaleLowerCase().includes(searchText.toLocaleLowerCase())
                    || String(a.attribution_or_contribution).toLocaleLowerCase().includes(searchText.toLocaleLowerCase())
                    || String(a.year).toLocaleLowerCase().includes(searchText.toLocaleLowerCase())
                );
                this.fillTable(filteredList);
                this.enableDownloadReport();
            })
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
                "record_type": "report",
                "report_ids": JSON.stringify(this.selectedReportIds),
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
                "record_type": "report",
                "report_ids": JSON.stringify(this.selectedReportIds),
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
                "record_type": "report",
                "report_ids": JSON.stringify(this.selectedReportIds),
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


    onLogoutClick = () => {
        document.cookie = `userEmail=null`;
        document.cookie = `jwt=null`;
        document.cookie = `isLoggedIn=false`;
        document.cookie = `userRoleId=null`;
        this.pageAlert("Logged out successfully", 1);
        setTimeout(() => window.location.replace("mande_tool.html"));
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


    getWithFile = (reqHead, path) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "GET",
                "headers": reqHead,
                "beforeSend": () => this.startWaiting(),
                "url": `${this.apiUrl}/${path}`,
                "xhrFields": { "responseType": "blob" },
                "success": response => resolve(response),
                "error": err => reject(err)
            })
        });
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