$(window).on("load", () => {
    let countryId = parseInt(getCookies(document.cookie).countryId) || parseInt(getCookies(document.cookie).initialCountryId);
    let filterCountry = $("select#filter-country");
    filterCountry.on("change", () => switchOverviewByCountry(filterCountry.val()));
    let userRoleId = parseInt(getCookies(document.cookie).userRoleId);
    // userRoleId == 1 ? filterCountry.show() : filterCountry.hide();
    let userMgmtLink = $("li#user-management-link");
    userRoleId == 1 ? userMgmtLink.show() : userMgmtLink.hide();
    let userEmail = getCookies(document.cookie).userEmail;
    let loggedInUserEmailLabel = $("li#user-email-label");
    loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${userEmail}</div>`);
    filterCountry.val(countryId).trigger("change");
    let userCountryIcon = $("img#user-country-icon");
    let isLoggedIn = getCookies(document.cookie).isLoggedIn;
    let initialCountryId = parseInt(getCookies(document.cookie).initialCountryId);
    isLoggedIn
        ? userRoleId != 1
            ? userCountryIcon.attr("src", `./assets/flag_icons/${initialCountryId}.png`).attr("title", flagIndex[initialCountryId]).show()
            : userCountryIcon.attr("src", null).attr("title", null).hide()
        : userCountryIcon.attr("src", null).attr("title", null).hide();
});

const switchOverviewByCountry = (countryId) => {
    document.cookie = `countryId=${countryId}`;
    new CountryOverview(countryId).init();
}

class CountryOverview {
    constructor(countryId) {
        this.apiUrl = apiUrl;
        this.countryId = countryId;
        this.countryIndex = [
            { "countryId": 5, "fileName": "kenya.html"},
            { "countryId": 7, "fileName": "senegal.html"},
            { "countryId": 4, "fileName": "srilanka.html"},
            { "countryId": 2, "fileName": "zambia.html"},
        ];
        this.chosenCountry = this.countryIndex.find(b => b.countryId == this.countryId);
        this.contentOverview = $("div#content-overview");
        this.rankLabel = $("span#number-sdg-rank");

        this.filterCountry = $("select#filter-country");
        
        // check if editable, take cookies first
        this.cookieObject = getCookies(document.cookie);
        this.jwt = this.cookieObject.jwt;
        this.userEmail = this.cookieObject.userEmail;
        this.isLoggedIn = this.cookieObject.isLoggedIn;
        this.userRoleId = this.cookieObject.userRoleId;
        this.initialCountryId = this.cookieObject.initialCountryId;
        this.authHeader = { "Authorization": this.jwt };
        
        // 
        this.editPageShortcut = `<a href="edit_country_info.html?from=country-overview"
            class="btn btn-rounded-1 p-3" id="shortcut_edit">
            Edit Details 
            <img class="ps-2" src="./assets/images/edit.svg">
        </a>`;
        this.editPageShortcutHolder = $("div#edit-page-shortcut-holder");

    }

    init = () => {
        // if logged in, only productadmin should be able to view the edit page shortcut
        if(this.isLoggedIn && this.userRoleId == 1){
            this.editPageShortcutHolder.empty().html(this.editPageShortcut)
        } else this.editPageShortcutHolder.empty();
        this.execute();
    }

    execute = () => {
        Promise.all([
            this.loadHtmlFile(this.chosenCountry.fileName),
            this.getApi({}, `cms/country_overview?country_id=${this.chosenCountry.countryId}`)
        ])
        .then(response => {
            let [template, apiResponse] = response;
            this.contentOverview.empty().append(template);
            this.fillItems(apiResponse.data, this.chosenCountry.countryId)
        })
        .catch(err => {
            this.pageAlert("Unable to get country overview data", 0);
            console.error(err);
        })
        .finally(this.stopWaiting);
    }

    fillItems = (data, countryId) => {
        switch(true){
            case countryId == 5: this.fill5Items(data); break;
            case countryId == 7: this.fill7Items(data); break;
            case countryId == 4: this.fill4Items(data); break;
            case countryId == 2: this.fill2Items(data); break;
            default: break;
        }
    }

    fill5Items = data => {
        // Kenya
        const items = itemId => data.find(b => b.item_id == itemId);
        this.rankLabel.empty().html(items(2).value);
        $("div[data-item-id='4']").empty().html(`${items(4).value || "N/A"}<span>&nbsp;(${items(4).year})</span>`);
        $("div[data-item-id='5']").empty().html(`${items(5).value || "N/A"}<span>&nbsp;(${items(5).year})</span>`);
        $("div[data-item-id='6']").empty().html(`${items(6).value || "N/A"}<span>&nbsp;(${items(6).year})</span>`);
        $("div[data-item-id='7']").empty().html(`${items(7).value || "N/A"}<span>&nbsp;(${items(7).year})</span>`);
        $("div[data-item-id='8']").empty().html(`${items(8).value || "N/A"}<span>&nbsp;(${items(8).year})</span>`);
        $("div[data-item-id='9']").empty().html(`${items(9).value || "N/A"}<span>&nbsp;(${items(9).year})</span>`);
        $("div[data-item-id='10']").empty().html(`${items(10).value || "N/A"}<span>&nbsp;(${items(10).year})</span>`);
        $("div[data-item-id='11']").empty().html(`<h1>${items(11).value || "N/A"}</h1><p>(${items(11).year || "N/A"})</p><p>${items(11).label || "N/A"}</p>`);
        $("div[data-item-id='12']").empty().html(`<h1>${items(12).value || "N/A"}</h1><p>(${items(12).year || "N/A"})</p><p>${items(12).label || "N/A"}</p>`);
        $("div[data-item-id='13']").empty().html(`<h1>${items(13).value || "N/A"}</h1><p>(${items(13).year || "N/A"}) (${items(13).support_text || "N/A"})</p><p>${items(13).label || "N/A"}</p>`);
        $("div[data-item-id='14']").empty().html(`<h1>${items(14).value || "N/A"}</h1><p>(${items(14).year || "N/A"})</p><p>${items(14).label || "N/A"}</p>`);
        $("span[data-item-id='15']").empty().html(`${items(15).value}`);
        $("p[data-item-id='15']").empty().html(`${items(15).main_text}`);
        $("span[data-item-id='16']").empty().html(`${items(16).value}`);
        $("p[data-item-id='17']").empty().html(`${items(17).main_text}`);
        $("p[data-item-id='18']").empty().html(`${items(18).main_text}`);
        $("p[data-item-id='19']").empty().html(`${items(19).main_text}`);
        $("p[data-item-id='20']").empty().html(`${items(20).main_text}`);

    }

    fill7Items = data => {
        // Senegal
        const items = itemId => data.find(b => b.item_id == itemId);
        this.rankLabel.empty().html(items(22).value);
        $("div[data-item-id='24']").empty().html(`${items(24).value || "N/A"}<span>&nbsp;(${items(24).year})</span>`);
        $("div[data-item-id='25']").empty().html(`${items(25).value || "N/A"}<span>&nbsp;(${items(25).year})</span>`);
        $("div[data-item-id='26']").empty().html(`${items(26).value || "N/A"}<span>&nbsp;(${items(26).year})</span>`);
        $("div[data-item-id='27']").empty().html(`${items(27).value || "N/A"}<span>&nbsp;(${items(27).year})</span>`);
        $("div[data-item-id='28']").empty().html(`${items(28).value || "N/A"}<span>&nbsp;(${items(28).year})</span>`);
        $("div[data-item-id='29']").empty().html(`${items(29).value || "N/A"}<span>&nbsp;(${items(29).year})</span>`);
        $("div[data-item-id='30']").empty().html(`${items(30).value || "N/A"}<span>&nbsp;(${items(30).year})</span>`);
        $("div[data-item-id='31']").empty().html(`<h1>${items(31).value || "N/A"}</h1><p>(${items(31).year || "N/A"})</p><p>${items(31).label || "N/A"}</p>`);
        $("div[data-item-id='32']").empty().html(`<h1>${items(32).value || "N/A"}</h1><p>(${items(32).year || "N/A"})</p><p>${items(32).label || "N/A"}</p>`);
        $("div[data-item-id='33']").empty().html(`<h1>${items(33).value || "N/A"}</h1><p>(${items(33).year || "N/A"}) (${items(33).support_text || "N/A"})</p><p>${items(33).label || "N/A"}</p>`);
        $("div[data-item-id='34']").empty().html(`<h1>${items(34).value || "N/A"}</h1><p>(${items(34).year || "N/A"})</p><p>${items(34).label || "N/A"}</p>`);
        $("span[data-item-id='35']").empty().html(`${items(35).value}`);
        $("p[data-item-id='35']").empty().html(`${items(35).main_text}`);
        $("span[data-item-id='36']").empty().html(`${items(36).value}`);
        $("p[data-item-id='36']").empty().html(`${items(36).main_text}`);
        $("p[data-item-id='37']").empty().html(`${items(37).main_text}`);
        $("p[data-item-id='38']").empty().html(`${items(38).main_text}`);
        $("p[data-item-id='39']").empty().html(`${items(39).main_text}`);
        $("p[data-item-id='40']").empty().html(`${items(40).main_text}`);
    }

    fill4Items = data => {
        // Sri Lanka
        const items = itemId => data.find(b => b.item_id == itemId);
        this.rankLabel.empty().html(items(42).value);
        $("div[data-item-id='44']").empty().html(`${items(44).value || "N/A"}<span>&nbsp;(${items(44).year})</span>`);
        $("div[data-item-id='45']").empty().html(`${items(45).value || "N/A"}<span>&nbsp;(${items(45).year})</span>`);
        $("div[data-item-id='46']").empty().html(`${items(46).value || "N/A"}<span>&nbsp;(${items(46).year})</span>`);
        $("div[data-item-id='47']").empty().html(`${items(47).value || "N/A"}<span>&nbsp;(${items(47).year})</span>`);
        $("div[data-item-id='48']").empty().html(`${items(48).value || "N/A"}<span>&nbsp;(${items(48).year})</span>`);
        $("div[data-item-id='49']").empty().html(`${items(49).value || "N/A"}<span>&nbsp;(${items(49).year})</span>`);
        $("div[data-item-id='50']").empty().html(`${items(50).value || "N/A"}<span>&nbsp;(${items(50).year})</span>`);
        $("div[data-item-id='51']").empty().html(`<h1>${items(51).value || "N/A"}</h1><p>(${items(51).year || "N/A"})</p><p>${items(51).label || "N/A"}</p>`);
        $("div[data-item-id='52']").empty().html(`<h1>${items(52).value || "N/A"}</h1><p>(${items(52).year || "N/A"})</p><p>${items(52).label || "N/A"}</p>`);
        $("div[data-item-id='53']").empty().html(`<h1>${items(53).value || "N/A"}</h1><p>(${items(53).year || "N/A"}) (${items(53).support_text || "N/A"})</p><p>${items(53).label || "N/A"}</p>`);
        $("div[data-item-id='54']").empty().html(`<h1>${items(54).value || "N/A"}</h1><p>(${items(54).year || "N/A"})</p><p>${items(54).label || "N/A"}</p>`);
        $("span[data-item-id='55']").empty().html(`${items(55).value}`);
        $("p[data-item-id='55']").empty().html(`${items(55).main_text}`);
        $("span[data-item-id='56']").empty().html(`${items(56).value}`);
        $("p[data-item-id='56']").empty().html(`${items(56).main_text}`);
        $("p[data-item-id='57']").empty().html(`${items(57).main_text}`);
        $("p[data-item-id='58']").empty().html(`${items(58).main_text}`);
        $("p[data-item-id='59']").empty().html(`${items(59).main_text}`);
        $("p[data-item-id='60']").empty().html(`${items(60).main_text}`);
    }

    fill2Items = data => {
        // Zambia
        const items = itemId => data.find(b => b.item_id == itemId);
        this.rankLabel.empty().html(items(62).value);
        $("h6[data-item-id='63']").empty().html(`${items(63).main_text || "N/A"}`);
        $("p[data-item-id='63']").empty().html(`${items(63).support_text || "N/A"}`);
        $("h6[data-item-id='64']").empty().html(`${items(64).value || "N/A"}`);
        $("p[data-item-id='64']").empty().html(`${items(64).support_text || "N/A"}`);
        $("h6[data-item-id='65']").empty().html(`${items(65).main_text || "N/A"}`);
        $("p[data-item-id='65']").empty().html(`${items(65).support_text || "N/A"}`);
        $("h6[data-item-id='66']").empty().html(`${items(66).value || "N/A"}`);
        $("p[data-item-id='66']").empty().html(`${items(66).support_text || "N/A"}`);
        $("h6[data-item-id='67']").empty().html(`${items(67).main_text || "N/A"}`);
        $("p[data-item-id='67']").empty().html(`${items(67).support_text || "N/A"}`);
        $("h6[data-item-id='68']").empty().html(`${items(68).main_text || "N/A"}`);
        $("p[data-item-id='68']").empty().html(`${items(68).support_text || "N/A"}`);
        $("h6[data-item-id='69']").empty().html(`${items(69).main_text || "N/A"}`);
        $("p[data-item-id='69']").empty().html(`${items(69).support_text || "N/A"}`);
        $("h6[data-item-id='70']").empty().html(`${items(70).main_text || "N/A"}`);
        $("p[data-item-id='70']").empty().html(`${items(70).support_text || "N/A"}`);
        $("div[data-item-id='71']").empty().html(`<h1>${items(71).value || "N/A"}</h1><p>(${items(71).year || "N/A"})</p><p>${items(71).label || "N/A"}</p>`);
        $("div[data-item-id='72']").empty().html(`<h1>${items(72).value || "N/A"}</h1><p>(${items(72).year || "N/A"})</p><p>${items(72).label || "N/A"}</p>`);
        $("div[data-item-id='73']").empty().html(`<h1>${items(73).value || "N/A"}</h1><p>(${items(73).year || "N/A"}) (${items(73).support_text || "N/A"})</p><p>${items(73).label || "N/A"}</p>`);
        $("div[data-item-id='74']").empty().html(`<h1>${items(74).value || "N/A"}</h1><p>(${items(74).year || "N/A"})</p><p>${items(74).label || "N/A"}</p>`);
        $("span[data-item-id='75']").empty().html(`${items(75).value}`);
        $("p[data-item-id='75']").empty().html(`${items(75).main_text}`);
        $("span[data-item-id='76']").empty().html(`${items(76).value}`);
        $("p[data-item-id='76']").empty().html(`${items(76).main_text}`);
        $("p[data-item-id='77']").empty().html(`${items(77).main_text}`);
        $("p[data-item-id='78']").empty().html(`${items(78).main_text}`);
    }

    loadHtmlFile = fileName => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "GET",
                "beforeSend": this.startWaiting,
                "url": `assets/data/country_overview/${fileName}`,
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