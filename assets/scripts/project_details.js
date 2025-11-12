$(window).on("load", () => {
    const urlObject = new URL(window.location.href);
    const params = Array.from(urlObject.searchParams.keys()).map(a => {
        let result = {};
        result[a] = urlObject.searchParams.get(a);
        return result;
    }).reduce((a, b) => Object.assign(a, b), {});
    let projectDetails = new ProjectDetails(params);
    projectDetails.init();
});


class ProjectDetails {
    constructor(params) {
        this.apiUrl = apiUrl;
        this.projectId = params.projectId;

        this.cookieObject = getCookies(document.cookie);
        this.jwt = this.cookieObject.jwt;
        this.userEmail = this.cookieObject.userEmail;
        this.isLoggedIn = this.cookieObject.isLoggedIn;
        this.authHeader = { "Authorization": this.jwt };
        this.userRoleId = this.cookieObject.userRoleId;
        this.initialCountryId = this.cookieObject.initialCountryId;
        this.editShortcut = $("a#shortcut_edit");
        this.logoutLink = $("a#link-logout");
        this.userMgmtLink = $("li#user-management-link");
        this.loggedInUserEmailLabel = $("li#user-email-label");
        this.userCountryIcon = $("img#user-country-icon");

        this.categoryCatalog = { 1: "adaptation", 2: "mitigation", 3: "crosscutting" };
        this.flagIndex = {
            2: "Zambia",
            4: "Sri Lanka",
            7: "Senegal",
            5: "Kenya",
        };
    }

    init = () => {
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.userRoleId == 1 ? this.userCountryIcon.hide() : this.userCountryIcon.show();
        this.logoutLink.on("click", this.onLogoutClick);
        this.userRoleId != 1
            ? this.userCountryIcon.attr("src", `./assets/flag_icons/${this.initialCountryId}.png`).attr("title", this.flagIndex[this.initialCountryId]).show()
            : this.userCountryIcon.attr("src", null).attr("title", null).hide();
        this.fetchData();
    }

    onLogoutClick = () => {
        document.cookie = `userEmail=null`;
        document.cookie = `jwt=null`;
        document.cookie = `isLoggedIn=false`;
        document.cookie = `userRoleId=null`;
        setTimeout(() => window.location.replace("index.html"), 1000);
    }

    fetchData = () => {
        Promise.all([
            this.postApi(lookupsReqBody, {}, `projects/lookups`),
            this.getApi(`projects/details/${this.projectId}`),
        ])
            .then(response => {
                let [lookups, details] = response;
                this.fillDetails(lookups.data, details.data);
            })
            .catch(err => {
                console.error(err);
                this.pageAlert(err.responseJSON.message, 0);
                if (err.status == 401) {
                    this.onLogoutClick();
                }
            })
            .finally(() => this.stopWaiting());
    }

    fillDetails = (lookups, details) => {
        this.editShortcut.attr("href", `edit_project.html?project_id=${this.projectId}`);
        let categoryLookups = lookups.find(a => a.table == "category").lookup_data;
        let fundingOrgLookups = lookups.find(a => a.table == "funding_organizations").lookup_data;
        let catId = details.category ? details.category[0] : null;
        let catName = categoryLookups.find(b => b.id == catId).category
        $("a#shortcut-catalog").attr("href", catId ? `category_${this.categoryCatalog}.html` : "").html(catName);
        $("h4#text-project").html(details.project_name.replace(/�/g, ""));
        $("h4#text-budget").html(details.funding_amount ? strNum(details.funding_amount) : "N/A");
        $("h4#text-category").html(catName || "N/A");
        let sectorLookups = lookups.find(a => a.table == "sector").lookup_data;
        let sectorNames = details.sector_ids
            ? details.sector_ids.map(b => sectorLookups.find(c => c.id == b).sector || null).filter(Boolean).join(", ")
            : "N/A"
        $("h4#text-sector").html(sectorNames);
        let startYear = details.start_year || "N/A";
        let endYear = details.end_year || "";
        $("h4#text-duration").html(`${startYear} - ${endYear}`);

        let sdgTargeted = details.sdg_goal_ids
            ? details.sdg_goal_ids.filter(Boolean).map(b => {
                return `<div class="sdgGoals-box-3">
                    <div class="sdgGoalImgBox">
                        <img src="./assets/images/E_${b}.png" alt="E_${b}" class="sdgGoal-img mt-1" style="height: 60px; width: 60px;">
                    </div>
                    <!-- div class="sdgGoalIconBox">
                        <i class="fa fa-arrow-down text-danger"></i>
                    </div -->
                </div>`
            }).join("\n")
            : "N/A";
        $("div#text-sdg").html(sdgTargeted);

        let fundOrgHtml = details.funding_organizations
            ? details.funding_organizations.map(a => fundingOrgLookups.find(b => b.id == a)?.funding_organization || null).filter(Boolean).join(",")
            : null;
        $("div#text-funding-organizations").html(fundOrgHtml ? `<h4>${fundOrgHtml}</h4>` : "N/A");


    }

    getApi = (path) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "GET",
                "headers": this.authHeader,
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


    startWaiting = () => {
        let loadingIcon = `<div class="text-center"><div class="fa-3x mb-1"><i class="fa fa-spinner fa-pulse" aria-hidden="true"></i></div><span>Loading</span></div>`;
        $("#loading-modal-container").empty().html(loadingIcon);
        $('#loading-modal').modal('show');
    }

    stopWaiting = () => {
        $("#loading-modal-container").empty();
        $("#loading-modal").modal("hide");
    }

    zfill = (number, width) => {
        const numString = String(number);
        const padding = width - numString.length > 0 ? width - numString.length : 0;
        return '0'.repeat(padding) + numString;
    };

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