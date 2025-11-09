$(window).on("load", () => {
    let ccsList = new CCSList();
    ccsList.init();
});


class CCSList{
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
        // DOM objects
        this.ccsTableHead = $("thead#thead-ccs");
        this.ccsTableBody = $("tbody#tbody-ccs");
        this.btnModalDelete = $("button#btn-modal-delete");
    }

    init = () => {
        if(this.isLoggedIn){
            this.execute();
            // do auth/self and then execute in later stages
        } else {
            this.pageAlert("Please login", 0);
            window.location.replace("index.html");
        }
    }

    execute = () => {
        this.getApi(this.authHeader, "ccs/submit")
        .then(response => {
            if(response.data.length){
                this.fillTable(response.data);
            } else{
                this.ccsTableHead.empty().html(`<th>
                    <td>
                        <div class="text-center">
                            No data available, you can start by adding
                        </div>
                    </td>
                </th>`);
                this.ccsTableBody.empty();
            }
        })
        .then(() => {
            $("a.btn-delete").unbind("click").on("click", e => {
                let projectId = $(e.currentTarget).data("project-id");
                this.btnModalDelete.attr("data-project-id", projectId);
            });
            this.enableDeletion();
        })
        .catch(err => {
            console.error(err);
            let errMsg = err?.responseJSON?.message || ""
            this.pageAlert(`Unable to get records\n${errMsg}`, 0);
        })
        .finally(this.stopWaiting);

    }

    fillTable = (responseData) => {
        this.ccsTableHead.empty().html(`<tr>
            <th>S.No</th>
            <th>Project ID</th>
            <th>Project Title</th>
            <th>Recent Update</th>
            <th>Updated By</th>
            <th>Actions</th>
        </tr>`);
        let tbody = responseData.map((a, i) => `<tr>
            <td>${i + 1}</td>
            <td>${a.data_id}</td>
            <td>${a.project_title}</td>
            <td>${a.last_modified_on}</td>
            <td>${a.updated_by}</td>
            <td>
                <div class="d-flex">
                    <div>
                        <a role="button" 
                            class="btn btn-transparent user-text dropdown-item user-edit text-center"
                            title="Edit Record #${a.data_id}"
                            href="edit_ccs_details.html?data_id=${a.data_id}"
                            target="_blank"
                            alt="Edit Record"
                        >
                            <img src="assets/images/edit-user.svg"  alt="Edit User">
                        </a>
                    </div>
                    <div>
                        <a role="button" 
                            class="btn btn-transparent user-text dropdown-item user-edit text-center"
                            data-project-id="${a.data_id}"
                            data-toggle="modal"
                            data-target="#modal-delete"
                            alt="Delete Record"
                        >
                            <img src="assets/images/trash.svg"
                                alt="Delete Role">
                        </a>
                    </div>
                </div>
            </td>
        </tr>`).join("\n");
        this.ccsTableBody.empty().html(tbody);
    }

    enableDeletion = () => {
        this.btnModalDelete.on("click", e => {
            let dataId = $(e.currentTarget).data("project-id");
            this.deleteApi(this.authHeader, `ccs/submit?data_id=${dataId}`)
            .then(response => {
                this.pageAlert(response.message, 1);
                setTimeout(() => window.location.reload(), 3000);
            })
            .catch(err => {
                console.error(err);
                let errMsg = err?.responseJSON?.message || ""
                this.pageAlert(`Unable to delete this record ${dataId}\n${errMsg}`, 0);
            })
            .finally(this.stopWaiting);
        });
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

    deleteApi = (reqHead, path) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "DELETE",
                "headers": reqHead,
                "beforeSend": () => this.startWaiting(),
                "url": `${this.apiUrl}/${path}`,
                "success": response => resolve(response),
                "error": err => reject(err)
            })
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