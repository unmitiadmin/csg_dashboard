$(window).on("load", () => {
    let userProfile = new UserProfile();
    userProfile.init();
});

class UserProfile{
    constructor(){
        this.apiUrl = apiUrl;
        this.cookieObject = getCookies(document.cookie);
        this.jwt = this.cookieObject.jwt;
        this.userEmail = this.cookieObject.userEmail;
        this.isLoggedIn = this.cookieObject.isLoggedIn;
        this.userRoleId = this.cookieObject.userRoleId;
        this.initialCountryId = this.cookieObject.initialCountryId;
        this.authHeader = {"Authorization": this.jwt};
        this.logoutLink = $("a#link-logout");
        this.userMgmtLink = $("li#user-management-link");
        this.loggedInUserEmailLabel = $("li#user-email-label");
        this.userCountryIcon = $("img#user-country-icon");

        // Profile fields
        this.labelUsername = $("span#label-username");
        this.labelEmail = $("span#label-email");

        // Reset Password Fields
        this.inputCurrentPassword = $("input#input-current-password");
        this.inputNewPassword = $("input#input-new-password");
        this.inputConfirmNewPassword = $("input#input-confirm-new-password");
        this.submitResetPassword = $("button#submit-reset-password");
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
        if(!this.initialCountryId) this.userCountryIcon.attr("src", null).hide();
        this.userRoleId != 1
            ? this.userCountryIcon.attr("src", `./assets/flag_icons/${this.initialCountryId}.png`).show()
            : this.userCountryIcon.attr("src", null).hide();
        this.execute();
    }

    execute = () => {
        this.getApi(this.authHeader, "auth/self")
        .then(response => {
            this.labelEmail.empty().html(response.data.email)
            this.labelUsername.empty().html(response.data.name);
        })
        .then(() => {
            this.submitResetPassword.on("click", this.resetPassword);
        })
        .catch(err => {
            this.pageAlert(err.responseJSON.message, 0);
            console.error(err);
        })
        .finally(this.stopWaiting);
    }

    resetPassword = () => {
        let currentPassword = this.inputCurrentPassword.val();
        let newPassword = this.inputNewPassword.val();
        let confirmNewPassword = this.inputConfirmNewPassword.val();

        if(newPassword !== confirmNewPassword){
            this.pageAlert("Passwords do not match, please check", 0);
        } else{
            let reqBody = {
                "purpose": "reset_password",
                "current_password": currentPassword,
                "new_password": newPassword,
            }
            this.patchApi(reqBody, this.authHeader, "auth/self")
            .then(response => {
                if(response.success) {
                    this.pageAlert(response.message, 1);
                    this.inputCurrentPassword.val("");
                    this.inputNewPassword.val("");
                    this.inputConfirmNewPassword.val("");
                }
            })
            .catch(err => {
                this.pageAlert(err.responseJSON.message, 0);
                console.error(err);
            })
            .finally(this.stopWaiting);
        }
        
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

    uqArray = arr => [...new Set(arr)];

    pageAlert = (text, success) => {
        let alertIcon = success 
            ? `<img src="assets/images/success.png"><h5 class="success-text-popup my-2">SUCCESS!</h5>`
            : `<img src="assets/images/success-false.png"><h5 class="success-text-popup my-2">ERROR!</h5>`;
        $("div#icon-alert-modal").empty().html(alertIcon);
        $("h5#text-alert-modal").empty().html(text);
        $("div.modal#alertModal").modal("show");

        if(success == 1) $("div.modal").not("#alertModal").modal("hide");
    }
}