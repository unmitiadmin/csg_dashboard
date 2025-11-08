$(window).on("load", () => {
    

    let editCountryInfo = new EditCountryInfo();
    editCountryInfo.init();
});

class EditCountryInfo{
    constructor(){
        this.apiUrl = apiUrl;
        this.cookieObject = getCookies(document.cookie);
        this.jwt = this.cookieObject.jwt;
        this.userEmail = this.cookieObject.userEmail;
        this.isLoggedIn = this.cookieObject.isLoggedIn;
        this.userRoleId = this.cookieObject.userRoleId;
        this.countryId = this.cookieObject.countryId;
        this.initialCountryId = this.cookieObject.initialCountryId;
        this.authHeader = { "Authorization": this.jwt };
        this.logoutLink = $("a#link-logout");
        this.userMgmtLink = $("li#user-management-link");
        this.loggedInUserEmailLabel = $("li#user-email-label");
        // this.userCountryIcon = $("img#user-country-icon");
        
        this.filterCountry = $("select#filter-country");
        this.countryIndex = [
            { "countryId": 5, "fileName": "edit_kenya.html"},
            { "countryId": 7, "fileName": "edit_senegal.html"},
            { "countryId": 4, "fileName": "edit_srilanka.html"},
            { "countryId": 2, "fileName": "edit_zambia.html"},
        ];
        this.chosenCountry = {};

        // Country Overview
        this.formBoxCountryOverview = $("div#formbox-country-overview");
        this.submitEditCountryOverview = $("button#submit-edit-country-overview");

    }

    init = () => {
        const urlObject = new URL(window.location.href);
        const params = Array.from(urlObject.searchParams.keys()).map(a => {
            let result = {};
            result[a] = urlObject.searchParams.get(a);
            return result;
        }).reduce((a, b) => Object.assign(a, b), {});

        // let pageComingFrom = params?.from ? `${params.from}.html` : null;
        // make this variable switchable, for climateOutlook
        if(this.isLoggedIn && this.userRoleId == 1){
            this.filterCountry.prop("disabled", false);
            this.filterCountry.val(this.countryId)
            this.filterCountry.on("change", e => {
                this.countryOverviewExecute(e.target.value); // make it switchable later
            }).trigger("change");
        } else {
            this.filterCountry.prop("disabled", true);
            this.pageAlert("You are unauthorized to edit information", 0);
            setTimeout(() => window.location.replace("country_overview.html"));
        }
    }


    countryOverviewExecute = (countryId) => {
        let chosenCountry = this.countryIndex.find(a => a.countryId == countryId);
        Promise.all([
            this.loadHtmlFile(`country_overview/${chosenCountry.fileName}`),
            this.getApi({}, `cms/country_overview?country_id=${chosenCountry.countryId}`)
        ])
        .then(([template, cmsResponse]) => {
            if(cmsResponse.success){
                this.formBoxCountryOverview.empty().html(template);
                cmsResponse.data.forEach(item => {
                    let fieldMapping = {
                        value: item.value || null,
                        main_text: item.main_text || null,
                        support_text: item.support_text || null,
                        year: item.year || null,
                    };
                    Object.keys(fieldMapping).forEach(field => {
                        let inputElement = $(`.edit-country-overview[data-item-id="${item.item_id}"][data-field="${field}"]`);
                        if (inputElement.length)  inputElement.val(fieldMapping[field]);
                    });
                });
            }
        })
        .then(() => {
            this.submitEditCountryOverview.unbind("click").on("click", () => {
                let formData = {};
                $(".edit-country-overview").each((_, e) => {
                    let itemId = $(e).data("item-id");
                    let field = $(e).data("field");
                    let value = $(e).val();
                    if (!formData[itemId]) {
                        formData[itemId] = {
                            id: itemId,
                            value: null,
                            main_text: null,
                            support_text: null,
                            year: null
                        };
                    }
                    formData[itemId][field] = value || null;
                });
                this.countryOverviewUpdate(Object.values(formData));
            });
        })
        .catch(err => {
            this.pageAlert("Unable to get country overview data", 0);
            console.error(err);
        })
        .finally(this.stopWaiting);
    }

    countryOverviewUpdate = (formData) => {
        console.log(formData);
        this.patchApi(formData, this.authHeader, `cms/country_overview`)
        .then(response => {
            this.pageAlert(response.message, 1)
        })
        .catch(err => {
            this.pageAlert("Unable to update country overview data", 0);
            console.error(err);
        })
        .finally(this.stopWaiting);
    }


    loadHtmlFile = fileName => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "GET",
                "beforeSend": this.startWaiting,
                "url": `assets/data/${fileName}`,
                "success": response => resolve(response),
                "error": err => reject(err)
            });
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
            })
        });
    }

    patchApi = (reqBody, reqHead, path) => {
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

    pageAlert = (text, success) => {
        let alertIcon = success 
            ? `<img src="assets/images/success.png"><h5 class="success-text-popup my-2">SUCCESS!</h5>`
            : `<img src="assets/images/success-false.png"><h5 class="success-text-popup my-2">ERROR!</h5>`;
        $("div#icon-alert-modal").empty().html(alertIcon);
        $("h5#text-alert-modal").empty().html(text);
        $("div.modal#alertModal").modal("show");
    }
}