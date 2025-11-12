$(window).on("load", () => {
    let rolesCapabilities = new RolesCapabilities();
    rolesCapabilities.init();
})

class RolesCapabilities{
    constructor(){
        this.apiUrl = apiUrl;
        this.cookieObject = getCookies(document.cookie);
        this.jwt = this.cookieObject.jwt;
        this.userEmail = this.cookieObject.userEmail;
        this.isLoggedIn = this.cookieObject.isLoggedIn;
        this.authHeader = {"Authorization": this.jwt};
        this.userRoleId = this.cookieObject.userRoleId;
        this.initialCountryId = this.cookieObject.initialCountryId;
        this.editShortcut = $("a#shortcut_edit");
        this.logoutLink = $("a#link-logout");
        this.userMgmtLink = $("li#user-management-link");
        this.loggedInUserEmailLabel = $("li#user-email-label");
        this.userCountryIcon = $("img#user-country-icon");
    }

    onLogoutClick = () => {
        document.cookie = `userEmail=null`;
        document.cookie = `jwt=null`;
        document.cookie = `isLoggedIn=false`;
        document.cookie = `userRoleId=null`;
        document.cookie = `initialCountryId=null`;
        setTimeout(() => this.pageAlert("Logged out successfully", 1), 1000);
        window.location.replace("index.html");
    }

    init = () => {
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.logoutLink.on("click", this.onLogoutClick);
        if(this.userRoleId != 1){
            this.userCountryIcon.attr("src", `./assets/flag_icons/${this.initialCountryId}.png`).show();
        } else {
            this.userCountryIcon.attr("src", null).hide();
        }
        if(this.userRoleId != 1){
            this.pageAlert("You are unauthorized to view this page", 0);
            setTimeout(() => window.location.replace("index.html"), 3000);
        } else this.getRoleMatrix();
    }

    getRoleMatrix = () => {
        this.getApi(this.authHeader, "auth/roles")
        .then(response => {
            if(response.success){
                response.data.forEach(item => {
                    ["productadmin", "country_admin", "province_admin", "district_admin", "department_admin"]
                    .forEach(role => {
                        let value = item[role];
                        let checkbox = $(`input[type="checkbox"][data-capability="${item.capability}"][data-role="${role}"]`);
                        if (checkbox.length) checkbox.prop('checked', value === 1);
                        if(role == "productadmin") checkbox.prop("disabled", true)
                    });
                });
            }
        })
        .then(() => {
            $(`input[type='checkbox'].custom-control-input`).on("change", e => {
                let reqBody = {
                    "capability": $(e.currentTarget).data("capability"),
                    "role": $(e.currentTarget).data("role"),
                    "checked": $(e.currentTarget).prop("checked") ? 1 : 0
                }
                this.updateMatrixItem(reqBody);
            })
        })
        .catch(err => {
            this.pageAlert(err.responseJSON.message, 0);
            console.error(err)
        })
        .finally(this.stopWaiting);
    }

    updateMatrixItem = (reqBody) => {
        this.patchApi(reqBody, this.authHeader, "auth/roles")
        .then(response => {
            if(!response.success) this.pageAlert("Unable to change the permission", 0);
        })
        .catch(err => {
            this.pageAlert(err.responseJSON.message, 0);
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

    patchApi = (reqBody, reqHead, path) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "PATCH",
                "headers": reqHead,
                "contentType": "application/json",
                "data": JSON.stringify(reqBody),
                "beforeSend": () => this.startWaiting(),
                "url": `${this.apiUrl}/${path}`,
                "success": response => resolve(response),
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