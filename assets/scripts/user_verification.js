$(window).on("load", () => {
    const urlObject = new URL(window.location.href);
    const params = Array.from(urlObject.searchParams.keys()).map(a => {
        let result = {};
        result[a] = urlObject.searchParams.get(a);
        return result;
    }).reduce((a, b) => Object.assign(a, b), {});
    let userVerification = new UserVerification(params.uuid);
    userVerification.init();
})

class UserVerification{
    constructor(uuid){
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
        this.verificationToken = uuid;
    }

    init = () => {
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.logoutLink.on("click", this.onLogoutClick);
        this.userRoleId != 1
            ? this.userCountryIcon.attr("src", `./assets/flag_icons/${this.initialCountryId}.png`).show()
            : this.userCountryIcon.attr("src", null).hide();
        this.processVerification();
    }

    processVerification = () => {
        let reqBody = {
            "token": this.verificationToken
        };
        this.patchApi(this.authHeader, reqBody, "auth/verify")
        .then(response => {
            this.displayMessage(response.success, response.message)
        })
        .finally(() => this.stopWaiting());
    }

    displayMessage = (success, message) => {
        let image = success ? "success.png" : "success-false.png";
        let contentHtml = `
            <h4 class="pb-3 mb-0">Email Verification </h4>
            <p class="success-text mb-0">${message}</p>
            <img src="assets/images/${image}" alt="" height="75px">
            <p class="success-text mb-0">Please click on "Home" button to navigate to our platform</p>
            <div class="d-flex justify-content-center px-0  pb-2">
                <a href="index.html" class="btn btn-join-submit">Home</a>
            </div>
        `;
        $("div#message-container").empty().html(contentHtml);
        if(!success){
            $("li#user-li").empty();
            $("li#flag-li").empty();
        }
    }


    patchApi = (reqHead, reqBody, path) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "PATCH",
                "headers": reqHead,
                "data": JSON.stringify(reqBody),
                "contentType": "application/json",
                "beforeSend": () => this.startWaiting(),
                "url": `${this.apiUrl}/${path}`,
                "success": response => resolve(response),
                "error": err => reject(err)
            })
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
}