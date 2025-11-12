$(window).on("load", () => {
    let countryId = parseInt(getCookies(document.cookie).countryId) || parseInt(getCookies(document.cookie).initialCountryId);
    let addOutcome = new NDC(countryId);
    addOutcome.init();
});

class NDC {
    constructor(countryId) {
        this.apiUrl = apiUrl;
        this.countryId = countryId
        this.cookieObject = getCookies(document.cookie);
        this.jwt = this.cookieObject.jwt;
        this.userEmail = this.cookieObject.userEmail;
        this.isLoggedIn = this.cookieObject.isLoggedIn;
        this.userRoleId = this.cookieObject.userRoleId;
        this.initialCountryId = this.cookieObject.initialCountryId;
        this.authHeader = { "Authorization": this.jwt };

        const urlObject = new URL(window.location.href);
        const params = Object.fromEntries(urlObject.searchParams.entries());
        this.selected_ndc_id = params?.id;

        if (this.selected_ndc_id) {
            $('#ndc_type').text('Edit')
        }

        this.sdg_targets = {}
        this.sector_data = []
        this.logoutLink = $("a#link-logout");

    }

    init = () => {

        this.serverGetApi(this.authHeader, "auth/self")
            .then(response => {
                if (response.data.role_id <= 2) this.fetchData();
                else {
                    this.pageAlert("You are unauthorized to add a NDC", 0);
                    setTimeout(() => window.location.replace("index.html"), 3000);
                }
            })
            .catch(err => {
                console.error(err);
                this.pageAlert("You are unauthorized to add a NDC", 0);
                setTimeout(() => window.location.replace("index.html"), 3000);
            })
            .finally(this.stopWaiting);
        // this.fetchData();

        $("#demo_0").ionRangeSlider({
            min: 0,
            max: 100,
            from: 0,
            postfix: "%"
        });

        $('#save_activity').click(() => {
            let category_id = $('#mainCategoryDropdown').find('input[type="radio"]:checked').val();
            let activity_type = $('#categoryDropdownMenu').find('input[type="radio"]:checked').val();

            let nonGraySDGTargets = this.getNonGraySDGTargets();

            let req_body = {
                country_id: 4,
                activity: $('#activity_name').val(),
                category_id: category_id, // 1/2/3 - Adaptation/Mitigation/Cross-cutting
                sector_id: activity_type,
                sdg: JSON.stringify(nonGraySDGTargets),
                value: $('#demo_0').val() // between 0 and 100
            };

            this.startWaiting();

            if (this.selected_ndc_id) {
                // Update existing activity
                this.serverPostApi(req_body, this.authHeader, `/ndc/activity?activity_id=${this.selected_ndc_id}`)
                    .then(response => {
                        if (response.success) {
                            this.pageAlert(response.data || "NDC activity updated successfully", 1);
                            this.resetForm();
                        } else {
                            this.pageAlert("Failed to update NDC activity", 0);
                        }
                    })
                    .catch(err => {
                        console.error(err);
                        this.pageAlert("Error updating NDC activity", 0);
                    })
                    .finally(() => this.stopWaiting());
            } else {
                // Create a new activity
                this.serverPostApi(req_body, this.authHeader, `/ndc/activity`)
                    .then(response => {
                        if (response.success) {
                            this.pageAlert(response.data || "Added new NDC activity", 1);
                            this.resetForm();
                        } else {
                            this.pageAlert("Failed to add new NDC activity", 0);
                        }
                    })
                    .catch(err => {
                        console.error(err);
                        this.pageAlert("Error adding new NDC activity", 0);
                    })
                    .finally(() => this.stopWaiting());
            }

        });

        $('#closeCreateNDC').click(function (e) {
            e.preventDefault(); // Prevent the default action of the link
            window.close(); // Close the current window
        });
        this.logoutLink.on("click", this.onLogoutClick);
    }

    resetForm = () => {
        $('#activity_name').val('');
        $('#mainCategoryDropdown input[type="radio"]').prop('checked', false);
        $('#dropdown-main-category').text('Nothing Selected');
        $('#categoryDropdownMenu input[type="radio"]').prop('checked', false);
        $('#dropdown-category').text('Nothing Selected');
        $('#sdgDropdownMenu input[type="checkbox"]').prop('checked', false);
        $('#dropdown-sdg').text('Nothing Selected');
        $('.ndc-list').empty();
        $('.icon-list li').removeClass('gray');
        const slider = $("#demo_0").data("ionRangeSlider");
        if (slider) {
            slider.update({ from: 0 });
        }
    }

    onLogoutClick = () => {
        document.cookie = `userEmail=null`;
        document.cookie = `jwt=null`;
        document.cookie = `isLoggedIn=false`;
        document.cookie = `initialCountryId=null`;
        document.cookie = `userRoleId=null`;
        this.pageAlert("Logged out successfully", 1);
        setTimeout(() => window.location.replace("index.html"), 1000);
    }

    fetchData = () => {

        let req_body1 = { "tables": ["country", "category"] }

        const promises = [
            this.serverGetApi(this.authHeader, `/ndc/sdg`),
            this.serverGetApi(this.authHeader, `/ndc/sdg_target`),
            this.serverGetApi(this.authHeader, `/ndc/sector?country_id=4`),
            this.serverGetApi(this.authHeader, `/ndc/activity?country_id=4`),
            this.serverPostApi(req_body1, this.authHeader, `/projects/lookups`),
        ];

        // Conditionally add the selected NDC API call if `this.selected_ndc_id` is defined
        if (this.selected_ndc_id) {
            promises.push(this.serverGetApi(this.authHeader, `/ndc/activity?activity_id=${this.selected_ndc_id}`));
        }

        Promise.all(promises)
            .then(([sdg, sdg_targets, sector, activity, lookup_data, selected_ndc_data]) => {
                this.sdg_targets = sdg_targets;
                this.sector_data = sector['data'];

                let $dropdownMenu2 = $('#mainCategoryDropdown');
                let $dropdownButton2 = $('#dropdown-main-category');

                $(document).on('change', 'input[name="mainCategory"]', function () {
                    // updateButtonText($dropdownMenu2, $dropdownButton2);

                    let selectedItems = $dropdownMenu2.find('input[type="radio"]:checked').map(function () {
                        let labelText = $(this).closest('label').text().trim();
                        if (labelText !== 'Select All') {
                            return labelText;
                        }
                    }).get();

                    if (selectedItems.length > 0) {
                        $dropdownButton2.text(selectedItems.join(', '));
                    } else {
                        $dropdownButton2.text('Nothing Selected');
                    }

                    let selectedCategory = $('input[name="mainCategory"]:checked').val();

                    // Filter sector_data based on the selected category
                    this.sector_data = sector['data'].filter(item => {
                        return item.category_id == selectedCategory;
                    });

                    this.generate_activity_types()
                }.bind(this));

                let $dropdownMenu1 = $('#sdgDropdownMenu');
                let $dropdownButton1 = $('#dropdown-sdg');

                $dropdownMenu1.empty();

                // $dropdownMenu1.append('<div class=""><input type="text" class="form-control ndc-search mx-3 mb-3" placeholder="search"></div>');

                $dropdownMenu1.append(`
                        <a class="dropdown-item pl-5" href="#">
                            <label class="form-check-label mb-0">
                                <input type="checkbox" class="form-check-input select-all" value=""> Select All
                            </label>
                        </a>
                    `);

                let s_no = 1;
                sdg['data'].forEach(function (item) {
                    $dropdownMenu1.append(`                            
                        <a class="dropdown-item pl-5 d-flex justify-content-between align-items-center" href="#">
                        <div>
                            <label class="form-check-label mb-0">
                                <input type="checkbox" class="form-check-input" name="sdg_goals" value="${item.id}"> ${s_no}. ${item.goal}
                            </label>
                        </div>
                        <div>
                            <img src="assets/images/E_${s_no}.png" height="40px">
                        </div>
                        </a>
                        `);
                    s_no++
                });

                $(document).on('click', '.select-all', function () {
                    let isChecked = $(this).prop('checked');
                    $dropdownMenu1.find('input[type="checkbox"]').prop('checked', isChecked);
                    updateButtonText($dropdownMenu1, $dropdownButton1);
                    get_selected_targets();

                });

                $(document).on('change', 'input[name="sdg_goals"]', function () {
                    updateButtonText($dropdownMenu1, $dropdownButton1);
                    get_selected_targets();
                });

                function get_selected_targets() {
                    let selectedIds = $dropdownMenu1.find('input[type="checkbox"]:checked').map(function () {
                        let value = $(this).val().trim();
                        if (value !== '') {
                            return value;
                        }
                    }).get();
                    let selected_sdg_targets = sdg_targets['data'].filter(item => {
                        return selectedIds.includes(item.sdg_id.toString());
                    });

                    for (let i = 0; i < selected_sdg_targets.length; i++) {
                        for (let j = 0; j < sdg['data'].length; j++) {
                            if (sdg['data'][j]['sdg_id'] === selected_sdg_targets[i]['sdg_id']) {
                                selected_sdg_targets[i]['sdg_goal'] = sdg['data'][j]['goal'];
                            }
                        }
                    }

                    $('.ndc-list').html(generateSDGList(selected_sdg_targets));

                }
                function updateButtonText(menu, button) {
                    let selectedItems = menu.find('input[type="checkbox"]:checked').map(function () {
                        let labelText = $(this).closest('label').text().trim();
                        if (labelText !== 'Select All') {
                            return labelText;
                        }
                    }).get();

                    if (selectedItems.length === sector['data'].length) {
                        button.text('All Selected');
                    } else if (selectedItems.length > 0) {
                        button.text(selectedItems.join(', '));
                    } else {
                        button.text('Nothing Selected');
                    }
                }

                function generateSDGList(data) {
                    let sdgList = '';

                    let groupedItems = data.reduce((acc, item) => {
                        if (!acc[item.sdg_id]) {
                            acc[item.sdg_id] = {
                                sdg_goal: item.sdg_goal,
                                imgSrc: `assets/images/E_${item.sdg_id}.png`,
                                targets: []
                            };
                        }
                        acc[item.sdg_id].targets.push(item.sdg_target_id + '. ' + item.target);
                        return acc;
                    }, {});

                    Object.keys(groupedItems).forEach((sdg_id, index) => {
                        let s_no = index + 1;
                        let { sdg_goal, imgSrc, targets } = groupedItems[sdg_id];

                        let iconList = `<ul class="icon-list mb-0">`;
                        targets.forEach(target => {
                            iconList += `
                                <li data-toggle="tooltip" data-placement="bottom" class="p${sdg_id} ml-0" title="${target}"></li>
                            `;
                        });
                        iconList += `</ul>`;

                        sdgList += `
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <div class="nowrap mr-3">                                     
                                    <span class="px-2">
                                        <img src="${imgSrc}" height="40px">
                                    </span> 
                                    ${sdg_id}. ${sdg_goal}
                                </div>
                                <div>
                                    ${iconList}
                                </div>
                            </li>
                        `; //<input type="checkbox" name="">
                    });

                    return sdgList;
                }

                $(document).on('click', '.icon-list li', function () {
                    $(this).toggleClass('gray');
                });

                if (selected_ndc_data && selected_ndc_data['data']) {
                    const data = selected_ndc_data['data'];

                    if (data['activity'] !== undefined) {
                        $('#activity_name').val(data['activity']);
                    }

                    if (data['category_id'] !== undefined) {
                        const radioButton = $('#mainCategoryDropdown').find(`input[name="mainCategory"][value="${data['category_id']}"]`);
                        if (radioButton.length > 0) {
                            radioButton.prop('checked', true);
                            const selectedText = radioButton.closest('a').find('.form-check-label').text().trim();
                            $('#dropdown-main-category').text(selectedText);
                            radioButton.trigger('change');
                        } else {
                            $('#dropdown-main-category').text('Nothing Selected');
                        }
                    }

                    if (data['sector_id'] !== undefined) {
                        const radioButton = $('#categoryDropdownMenu').find(`input[name="activity_type"][value="${data['sector_id']}"]`);
                        if (radioButton.length > 0) {
                            radioButton.prop('checked', true);
                            const selectedText = radioButton.closest('a').text().trim();
                            $('#dropdown-category').text(selectedText);
                        }
                    }

                    if (data['sdg'] !== undefined && data['sdg'].length > 0) {
                        let sdg_array = []
                        // for (let i = 0; i < data['sdg'].length; i++) {
                        //     for (let j = 0; j < data['sdg'][i].length; j++) {
                        //         let hasDecimal = this.hasDecimal(data['sdg'][i][j]);
                        //         let sdgId = hasDecimal ? parseInt(data['sdg'][i][j].toString().split('.')[0]) : data['sdg'][i][j];
                        //         sdg_array.push(sdgId);
                        //     }
                        // }

                        for (let i = 0; i < data['sdg'].length; i++) {
                            let currentItem = data['sdg'][i];

                            // Check if the current item is an array or a single value
                            if (Array.isArray(currentItem)) {
                                // Process each item in the array
                                for (let j = 0; j < currentItem.length; j++) {
                                    let value = currentItem[j];
                                    let hasDecimal = this.hasDecimal(value);
                                    let sdgId = hasDecimal ? parseInt(value.toString().split('.')[0]) : value;
                                    sdg_array.push(sdgId);
                                }
                            } else {
                                // Process a single value
                                let hasDecimal = this.hasDecimal(currentItem);
                                let sdgId = hasDecimal ? parseInt(currentItem.toString().split('.')[0]) : currentItem;
                                sdg_array.push(sdgId);
                            }
                        }

                        sdg_array.forEach(sdgId => {
                            const checkBox = $('#sdgDropdownMenu').find(`input[name="sdg_goals"][value="${sdgId}"]`);
                            if (checkBox.length > 0) {
                                checkBox.prop('checked', true);
                                checkBox.trigger('change');
                            }
                        });

                        const selectedItems = $('#sdgDropdownMenu').find('input[name="sdg_goals"]:checked').map(function () {
                            return $(this).closest('a').find('label').text().trim();
                        }).get().join(', ');

                        $('#dropdown-sdg').text(selectedItems || 'Nothing Selected');

                        $('.icon-list li').each((index, element) => {
                            let targetTitle = $(element).attr('title').trim();
                            const flattenedSDGs = data['sdg'].flat();
                            let target = this.sdg_targets['data'].find(item => {
                                if (flattenedSDGs.includes(item.sdg_target_id)) {
                                    let formattedTarget = item['sdg_target_id'] + '. ' + item['target'].trim();
                                    return formattedTarget === targetTitle;
                                } else if (flattenedSDGs.includes(item.sdg_id)) {
                                    let formattedTarget = item['sdg_target_id'] + '. ' + item['target'].trim();
                                    return formattedTarget === targetTitle;
                                }
                            });

                            if (!target) {
                                $(element).addClass('gray');
                            }
                        });



                    }

                    if (data['value'] !== undefined) {
                        const slider = $("#demo_0").data("ionRangeSlider");

                        if (slider) {
                            slider.update({
                                from: data['value']
                            });
                        }
                    }


                }

            })
            .catch(err => {
                console.error(err);
                if (err.status == 401) {
                    this.pageAlert("Session expired, please login", 0);
                    setTimeout(() => window.location.replace("index.html"), 1000);
                } else this.pageAlert("Unable to get data", 0);
            })
            .finally(() => this.stopWaiting())
    }

    hasDecimal(number) {
        return number % 1 !== 0;
    }

    generate_activity_types = () => {

        let $dropdownMenu = $('#categoryDropdownMenu');
        let $dropdownButton = $('#dropdown-category');

        $dropdownMenu.empty();
        $dropdownButton.text('Nothing Selected');

        // $dropdownMenu.append('<div class=""><input type="text" class="form-control ndc-search mx-3 mb-3" placeholder="search"></div>');

        // $dropdownMenu.append(`
        //         <a class="dropdown-item pl-5" href="#">
        //             <label class="form-check-label mb-0">
        //                 <input type="checkbox" class="form-check-input select-all" value=""> Select All
        //             </label>
        //         </a>
        //     `);

        this.sector_data.forEach(function (category) {
            $dropdownMenu.append(`
                    <a class="dropdown-item pl-5" href="#">
                        <label class="form-check-label mb-0">
                            <input type="radio" class="form-check-input" name="activity_type" value="${category.id}"> ${category.sector}
                        </label>
                    </a>
                `);
        });

        // $(document).on('click', '.select-all', function () {
        //     let isChecked = $(this).prop('checked');
        //     $dropdownMenu.find('input[type="checkbox"]').prop('checked', isChecked);
        //     updateButtonText($dropdownMenu, $dropdownButton);
        // });

        $(document).on('change', 'input[name="activity_type"]', function () {
            // updateButtonText($dropdownMenu, $dropdownButton);

            let selectedItems = $dropdownMenu.find('input[type="radio"]:checked').map(function () {
                let labelText = $(this).closest('label').text().trim();
                if (labelText !== 'Select All') {
                    return labelText;
                }
            }).get();

            if (selectedItems.length === this.sector_data.length) {
                $dropdownButton.text('All Selected');
            } else if (selectedItems.length > 0) {
                $dropdownButton.text(selectedItems.join(', '));
            } else {
                $dropdownButton.text('Nothing Selected');
            }
        }.bind(this));
    }

    hasDecimal(number) {
        return number % 1 !== 0;
    }

    localGetApi = (path) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "GET",
                "beforeSend": () => this.startWaiting(),
                "url": path,
                "success": response => resolve(response),
                "error": err => reject(err)
            })
        });
    }

    serverGetApi = (reqHead, path) => {
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

    serverPostApi = (reqBody, reqHead, path) => {
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

    serverPostApi = (reqBody, reqHead, path) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                "type": "POST",
                "headers": reqHead,
                "data": reqBody,
                "beforeSend": () => this.startWaiting(),
                "url": `${this.apiUrl}/${path}`,
                "success": response => resolve(response),
                "error": err => reject(err),
                complete: () => this.stopWaiting1()
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

    stopWaiting1 = () => {
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

    getNonGraySDGTargets = () => {
        let sdgTargetMap = {};

        $('.icon-list li').each((index, element) => {
            if (!$(element).hasClass('gray')) {
                let targetTitle = $(element).attr('title').trim();

                let target = this.sdg_targets['data'].find(item => {
                    return item['sdg_target_id'] + '. ' + item['target'].trim() === targetTitle
                });

                if (target) {
                    let sdg_id = target['sdg_id'];
                    let sdg_target_id = target['sdg_target_id'];

                    if (!sdgTargetMap[sdg_id]) {
                        sdgTargetMap[sdg_id] = [];
                    }

                    sdgTargetMap[sdg_id].push(sdg_target_id);
                } else {
                    console.log('No matching target found for title:', targetTitle);
                }
            }
        });

        let result = Object.values(sdgTargetMap);

        return result;
    }



}