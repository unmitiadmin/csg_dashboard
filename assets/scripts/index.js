$(window).on("load", () => {
    let countryId = getCookies(document.cookie).countryId || getCookies(document.cookie).initialCountryId;
    let index = new Index(countryId);
    index.init();
});

class Index {
    constructor(countryId) {
        this.countryId = countryId;
        this.apiUrl = apiUrl;
        this.selectedPageLink = null;
        this.pageShortcut = $(".page-shortcut");
        this.filterCountry = $("select#filter-country");

        this.redirectionLink = $('#redirectionLink');
        this.userMgmtLink = $("li#user-management-link");
        this.loggedInUserEmailLabel = $("li#user-email-label");
        this.userCountryIcon = $("img#user-country-icon");

        this.loginModal = $("div#login-modal");
        this.loginRequiredPages = {
            "country-overview": false,
            "climate_outlook": false,
            "project_tracker": true,
            "geospatial": true,
            "mande_tool": true,
            "development-indicators": false,
            "catalog_adaptation": true,
            "catalog_mitigation": true,
            "catalog_crosscutting": true,
            "adaptation_catalog": true,
            "investment_portfolio": false
        };
        // login form
        this.loginEmail = $("input#input-login-email");
        this.loginPassword = $("input#input-login-password");
        this.submitLogin = $("button#submit-login");
        // registration form
        this.registrationName = $("input#input-registration-name");
        this.registrationCountryId = $("select#input-registration-country");
        this.registrationPhone = $("input#input-registration-phone");
        this.registrationRoleId = $("select#input-registration-role")
        this.registrationEmail = $("input#input-registration-email");
        this.registrationOrganization = $("input#input-registration-organization");
        this.registrationDesignation = $("input#input-registration-designation");
        this.registrationOrganizationCategory = $("input#input-registration-organization-category");
        
        this.registrationGender = $("select#input-registration-gender");
        this.registrationReason = $("input#input-registration-reason");
        this.registrationPassword = $("input#input-registration-password");
        this.submitRegistration = $("button#submit-register");


        // cookies
        this.cookieObject = getCookies(document.cookie);
        this.jwt = this.cookieObject.jwt;
        this.userEmail = this.cookieObject.userEmail;
        this.isLoggedIn = this.cookieObject.isLoggedIn;
        this.userRoleId = this.cookieObject.userRoleId;
        this.initialCountryId = this.cookieObject.initialCountryId;
        this.authHeader = { "Authorization": this.jwt };


        this.labelProjects = $("h2#label_count_projects");
        this.labelCountries = $("h2#label_count_countries");
        this.labelBudget = $("h1#label_sum_funding");
        this.labelBeneficiaries = $("h3#label_sum_beneficiaries");
        this.labelSdg = $("h1#label_count_sdg");

    }

    init = () => {
        this.openLoginModal();
        this.getSummary();
        
        this.filterCountry.on("change", () => {
            this.countryId = this.filterCountry.val();
            document.cookie = `countryId=${this.countryId}`;
        });

        if (this.isLoggedIn) {
            this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
            this.filterCountry.val(this.initialCountryId);
            this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
            this.initialCountryId
                ? (
                    this.userRoleId != 1
                    ? this.userCountryIcon.attr("src", `./assets/flag_icons/${this.initialCountryId}.png`).show()
                    : this.userCountryIcon.attr("src", null).hide()
                ) : this.userCountryIcon.attr("src", null).hide();
            
            if (this.userRoleId == 1) {
                // this.filterCountry.attr("disabled", false);
                document.cookie = `initialCountryId=${this.initialCountryId}`;
                this.filterCountry.val(this.countryId).trigger("change");                
            } else {
                // this.filterCountry.attr("disabled", true);
                document.cookie = `initialCountryId=${this.initialCountryId}`;
                this.filterCountry.val(this.initialCountryId).trigger("change");
            }
        } else {
            this.loggedInUserEmailLabel.empty();
            // this.filterCountry.attr("disabled", false);
            this.filterCountry.val(this.countryId || $("select#filter-country option:first").val()).trigger("change");
        }
    }

    getSummary = () => {
        this.getApi({}, "projects/summary")
            .then(response => {
                if (response.success) {
                    this.labelProjects.empty().html(`${response.data.projects} `);
                    this.labelCountries.empty().html(`${response.data.countries}`);
                    this.labelBudget.empty().html(`${strNum(response.data.budget)} Dollars`);
                    this.labelBeneficiaries.empty().html(`${strNum(response.data.beneficiaries)} beneficiaries`);
                    this.labelSdg.empty().html(` ${response.data.sdg_impacted} SDGs`);
                }
            })
            .catch(err => {
                this.pageAlert("Unable to get projects' summary", 0);
                console.error(err);
            })
            .finally(this.stopWaiting)
    }

    

    openLoginModal = () => {

        this.pageShortcut.on("click", e => {
            this.countryId = parseInt(getCookies(document.cookie).countryId);
            let pageName = $(e.currentTarget).data("page");
            let requiresLoginPrompt = this.loginRequiredPages[pageName];
            this.selectedPageLink = pageName;
            this.redirectionLink.val(this.selectedPageLink);
            if (this.isLoggedIn) {
                window.location.replace(`${this.selectedPageLink}.html`);
                if (this.selectedPageLink == "investment_portfolio") {
                    this.pageAlert("This section will be included soon\n Investment Portfolio Planning", null)
                    window.location.replace("index.html");
                } else {
                    window.location.replace(`${this.selectedPageLink}.html`)
                }
            } else {
                if (requiresLoginPrompt) {
                    this.loginModal.modal("show");
                } else {
                    this.loginModal.modal("hide");
                    if (this.selectedPageLink == "investment_portfolio") {
                        this.pageAlert("This section will be included soon\n Investment Portfolio Planning", null)
                        window.location.replace("index.html");
                    } else {
                        window.location.replace(`${this.selectedPageLink}.html`)
                    }
                }
            }

        })
    }

    login = () => {
        let reqBody = {
            "email": this.loginEmail.val() || null,
            "password": this.loginPassword.val() || null,
        };
        // let countryId = this.countryId
        this.postApi(reqBody, {}, "auth/login")
            .then(response => {
                if (response.success) {
                    // disable the country filter if not admin, but set the country id first
                    this.filterCountry.val(response.initialCountryId);
                    document.cookie = `userEmail=${response.email}`;
                    document.cookie = `jwt=${response.jwt}`;
                    document.cookie = `isLoggedIn=true`;
                    document.cookie = `countryId=${this.countryId}`;
                    document.cookie = `initialCountryId=${response.initialCountryId}`;
                    document.cookie = `userRoleId=${response.userRoleId}`;
                    this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
                    window.location.replace(`${this.selectedPageLink}.html`);
                } else {
                    throw new Error(response.message);
                }
            })
            .catch(err => {
                this.loggedInUserEmailLabel.empty();
                // this.pageAlert(`Unable to login - ${err.responseJSON.message}`);
                this.pageAlert(`Unable to login - ${err.message}`, 0);
                console.error(err);
            })
            .finally(() => this.stopWaiting())
    }

    register = () => {
        let reqBody = {
            "full_name": this.registrationName.val() || null,
            "country_id": this.registrationCountryId.val() || null,
            "role_id": this.registrationRoleId.val() || null,
            "email": this.registrationEmail.val() || null,
            "password": this.registrationPassword.val() || null,
            "organization": this.registrationOrganization.val() || null,
            "designation": this.registrationDesignation.val() || null,
            "organization_category": this.registrationOrganizationCategory.val() || null,
            "phone": this.registrationPhone.val() || null,
            "gender": this.registrationGender.val() || null,
            "reason": this.registrationReason.val() || null
        }
        this.postApi(reqBody, {}, "auth/register")
            .then(response => {
                if (response.success) {
                    this.pageAlert(`User with email ${reqBody.email} is successfully registered`, 1);
                    this.registrationName.val("");
                    this.registrationEmail.val("");
                    this.registrationPassword.val("");
                    this.registrationOrganization.val("");
                    this.registrationDesignation.val("");
                    this.registrationOrganizationCategory.val("");
                    this.registrationPhone.val("");
                    this.registrationGender.val("");
                    this.registrationReason.val("");
                    $("button.nav-link#login-tab").trigger("click");
                } else {
                    this.pageAlert("Unable to register, please ensure to fill form fields", 0)
                }
            })
            .catch(err => {
                this.pageAlert(err.responseJSON.message, 0);
                console.error(err);
            })
            .finally(() => this.stopWaiting());
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