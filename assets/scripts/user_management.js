$(window).on("load", () => {
    
    let userManagement = new UserManagement();
    userManagement.init();
})

class UserManagement{
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

        // table body
        this.containerUserList = $("tbody#tbody-users-list");

        // new user form fields
        this.inputAddName = $("input#input-add-name");
        this.inputAddEmail = $("input#input-add-email");
        this.inputAddOriginCountry = $("select#input-add-origin-country");
        // this.inputAddCountry = $("select#input-add-country");
        this.inputAddOrganization = $("input#input-add-organization");
        this.inputAddDesignation = $("input#input-add-designation");
        this.inputAddOrganizationCategory = $("input#input-add-organization-category");
        this.inputAddPhone = $("input#input-add-phone");
        this.inputAddGender = $("select#input-add-gender");
        this.inputAddReason = $("input#input-add-reason");
        this.inputAddPassword = $("input#input-add-password");
        this.submitAdd = $("button#submit-add");

        // edit user form fields
        this.inputEditName = $("input#input-edit-name");
        this.inputEditEmail = $("input#input-edit-email");
        this.inputEditOriginCountry = $("select#input-edit-origin-country");
        // this.inputEditCountry = $("select#input-edit-country");
        this.inputEditOrganization = $("input#input-edit-organization");
        this.inputEditDesignation = $("input#input-edit-designation");
        this.inputEditOrganizationCategory = $("input#input-edit-organization-category");
        this.inputEditPhone = $("input#input-edit-phone");
        this.inputEditGender = $("select#input-edit-gender");
        this.inputEditReason = $("input#input-edit-reason");
        this.inputEditPassword = $("input#input-edit-password");
        this.submitEdit = $("button#submit-edit");

        // password reset form fields
        this.inputResetPassword = $("input#input-reset-password");
        this.inputResetPasswordConfirm = $("input#input-reset-password-confirm");
        this.submitResetPassword = $("button#submit-reset-password");
        this.closeAddForm = $("button#close-addUserModal");
        this.closeEditForm = $("button#close-editUserModal");
        this.closeResetPasswordForm = $("button#close-resetPasswordModal");

        // change role form fields
        this.inputEditRoleModal = $("select#input-edit-role-modal");
        this.submitEditRole = $("button#submit-edit-role");
        this.closeUserRoleEditForm = $("button#close-editUserRoleModal");
        this.inputEditRoleCountry

        // role based location array
        this.roleLkpReqBody = {"tables": ["province", "district"]};
        this.roleProvinceList = [];
        this.roleDistrictList = [];
        this.inputEditRoleCountry = $("select#input-edit-role-country");
        this.inputEditRoleProvince = $("select#input-edit-role-province");
        this.inputEditRoleDistrict = $("select#input-edit-role-district");
        this.fgEditRoleProvince = $("div.form-group#fg-input-role-province");
        this.fgEditRoleDistrict = $("div.form-group#fg-input-role-district");
        // this.roleMapValidity = false;
        this.selectpickerCommonOptions = {
            actionsBox: true,
            liveSearch: true,
            selectedTextFormat: "count > 1",
            size: 5,
        }
    }

    init = () => {
        this.loggedInUserEmailLabel.empty().html(`<div class='mx-3'>${this.userEmail}</div>`);
        this.userRoleId == 1 ? this.userMgmtLink.show() : this.userMgmtLink.hide();
        this.logoutLink.on("click", this.onLogoutClick);
        this.userRoleId != 1
            ? this.userCountryIcon.attr("src", `./assets/flag_icons/${this.initialCountryId}.png`).show()
            : this.userCountryIcon.attr("src", null).hide();
        if(this.userRoleId != 1){
            this.pageAlert("You are unauthorized to view this page", 0);
            setTimeout(() => window.location.replace("index.html"), 3000);
        } else this.getUsersList();
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

    getUsersList = () => {
        Promise.all([
            this.getApi(this.authHeader, "auth/role_list"),
            this.getApi(this.authHeader, "auth/manage"),
            this.postApi(this.roleLkpReqBody, {}, "projects/lookups"),
            this.getApi(this.authHeader, "auth/country")
        ])
        .then(([lkpRoleResponse, response, lkpResponse, lkpCountryResponse]) => {
            
            if(lkpRoleResponse.success && response.success && lkpResponse.success && lkpCountryResponse.success){
                // single select selectpicker for country of origin options
                let originCountyOptions = lkpCountryResponse.data.map(a => {
                    return `<option value="${a.country_id}">${a.country}</option>`;
                }).join("");
                this.inputAddOriginCountry.empty().html(originCountyOptions);
                this.inputAddOriginCountry.selectpicker(this.selectpickerCommonOptions);
                this.inputAddOriginCountry.selectpicker("val", null);
                this.inputAddOriginCountry.selectpicker("refresh");
                this.inputEditOriginCountry.empty().html(originCountyOptions);
                this.inputEditOriginCountry.selectpicker(this.selectpickerCommonOptions);
                this.inputEditOriginCountry.selectpicker("refresh");
                // project country filter for edit role
                this.inputEditRoleCountry.selectpicker(this.selectpickerCommonOptions);
                this.inputEditRoleCountry.selectpicker("val", null);
                this.inputEditRoleCountry.selectpicker("refresh");
                // single select selectpicker style to some select boxes
                // this.inputAddCountry.selectpicker(this.selectpickerCommonOptions);
                this.inputAddGender.selectpicker(this.selectpickerCommonOptions);
                // this.inputEditCountry.selectpicker(this.selectpickerCommonOptions);
                this.inputEditGender.selectpicker(this.selectpickerCommonOptions);
                let roleOptions = `<option value="" disabled>Role*</option>\n` 
                    + lkpRoleResponse.data.map(a => {
                        return `<option value="${a.id}">${a.role}</option>`;
                    }).join("\n");
                this.inputEditRoleModal.empty().html(roleOptions);
                this.inputEditRoleModal.selectpicker(this.selectpickerCommonOptions);
                this.roleProvinceList = lkpResponse.data.find(a => a.table == "province").lookup_data;
                this.roleDistrictList = lkpResponse.data.find(a => a.table == "district").lookup_data;
                let tBodyHtml = response.data.map((a, i) => {
                    let activityOption = a.active_status == "Active"
                        ? `<a role="button" 
                            class="btn btn-transparent user-text mx-1 dropdown-item user-status text-center" 
                            data-user-id="${a.user_id}" data-purpose="deactivate">
                                <img src="assets/images/deactive-user.svg" alt="Deactivate User"><br> Deactivate
                        </a>`
                        : `<a role="button" 
                            class="btn btn-transparent user-text mx-1 dropdown-item user-status text-center" 
                            data-user-id="${a.user_id}" data-purpose="activate">
                            <img src="assets/images/deactive-user.svg" alt="Activate User"><br>Activate
                        </a>`;
                    // removed approvalStatusOptions       
                    return `<tr>
                        <td>${i + 1}</td>
                        <td>${a.name}</td>
                        <td>${a.email}</td>
                        <td>${a.country || "<b>Unassigned</b>"}</td>
                        <td>${a.organization || "N/A"}</td>
                        <td>${a.designation || "N/A"}</td>
                        <td>${a.role || "N/A"}</td>
                        <td>${a.organization_category || "N/A"}</td>
                        <td>${a.phone || "N/A"}</td>
                        <td>${a.gender || "N/A"}</td>
                        <td>${a.reason || "N/A"}</td>
                        <td>${a.created_on || "N/A"}</td>
                        <td>${a.verification_status}</td>
                        <td>${a.active_status}</td>
                        <td style="background-color:#f9f9f9">
                            <div class="d-flex">
                                <div>
                                    <a role="button" class="btn btn-transparent user-text mx-1 dropdown-item user-edit text-center"
                                        data-user-id="${a.user_id}" alt="Edit User">
                                        <img src="assets/images/edit-user.svg" alt="Edit User"><br>Edit User
                                    </a>
                                </div>
                                <div>
                                    <a role="button" class="btn btn-transparent user-text mx-1 dropdown-item user-update-role text-center"
                                        data-user-id="${a.user_id}" data-user-email=${a.email} data-user-name="${a.name}" 
                                        data-user-role-id="${a.role_id}" data-user-country-id="${a.country_id || ''}"
                                        alt="Update Role">
                                        <img src="assets/images/upload-user.svg" alt="Upload Role"><br>Update Role
                                    </a>
                                </div>
                                <div>${activityOption}</div>
                                <div>
                                    <a role="button" class="btn btn-transparent user-text mx-1 dropdown-item user-reset-password text-center"
                                        data-user-id="${a.user_id}"  data-user-email=${a.email} data-user-name="${a.name}" alt="Reset Password">
                                        <img src="assets/images/upload-user.svg" alt="Reset Password"><br>Reset Password
                                    </a>
                                </div>
                            </div>
                        </td>
                    </tr>`;
                }).join("\n");
                this.containerUserList.empty().html(tBodyHtml);
            }
        })
        .then(() => {
            // New user
            this.submitAdd.on("click", this.addNewUser);
            // Status - Activity/Approval
            $("a.dropdown-item.user-status").on("click", e => {
                let userId = $(e.currentTarget).data("user-id");
                let purpose = $(e.currentTarget).data("purpose");
                this.updateUserStatus(userId, purpose);
            });
            // Edit user details
            $("a.dropdown-item.user-edit").on("click", e => {
                let userId = $(e.currentTarget).data("user-id");
                this.getUserData(userId);
            });
            // Change/reset user password
            $("a.dropdown-item.user-reset-password").on("click", e => {
                let userId = $(e.currentTarget).data("user-id");
                let email = $(e.currentTarget).data("user-email");
                $("div#resetPasswordModal").modal("show");
                $("h5#resetPasswordModalLabel").empty().html(`Reset Password for ${email}`);
                this.submitResetPassword.unbind("click").on("click", () => {
                    let newPassword = this.inputResetPassword.val();
                    let confirmNewPassword = this.inputResetPasswordConfirm.val();
                    if(newPassword == confirmNewPassword){
                        this.resetUserPassword(userId, newPassword)
                    } else this.pageAlert("Please ensure to enter same password to confirm", 0);
                })
            });
            // Change user role 
            $("a.dropdown-item.user-update-role").on("click", e => {
                // get from the data attributes
                let userId = $(e.currentTarget).data("user-id");
                let email = $(e.currentTarget).data("user-email"); 
                let userName = $(e.currentTarget).data("user-name");
                let currentRoleId = $(e.currentTarget).data("user-role-id");
                let countryId = $(e.currentTarget).data("user-country-id");
                // get the original selection ROLE-ID from the data attributes
                this.inputEditRoleModal.selectpicker("val", currentRoleId);
                this.inputEditRoleModal.selectpicker("refresh");
                this.inputEditRoleModal.unbind("change")
                    .on("change", e => {
                        let chosenCountryId = this.inputEditRoleCountry.selectpicker("val");
                        this.displayRoleMapFilter(e.target.value, chosenCountryId, userId);
                        this.inputEditRoleModal.selectpicker("val", e.target.value);
                        this.inputEditRoleModal.selectpicker("refresh");
                    })
                this.inputEditRoleModal.selectpicker("val", currentRoleId);
                this.inputEditRoleModal.selectpicker("refresh");
                // get the original selection COUNTRY-ID from the data attributes
                this.inputEditRoleCountry.selectpicker("val", countryId);
                this.inputEditRoleCountry.selectpicker("refresh");
                this.inputEditRoleCountry.unbind("change")
                    .on("change", e => {
                        let chosenRoleId = this.inputEditRoleModal.selectpicker("val");
                        this.displayRoleMapFilter(chosenRoleId, e.target.value, userId);
                        this.inputEditRoleCountry.selectpicker("val", e.target.value);
                        this.inputEditRoleCountry.selectpicker("refresh");
                    });
                
                if(currentRoleId && !countryId){
                    this.inputEditRoleModal.selectpicker("val", currentRoleId).selectpicker("refresh").trigger("change");
                }
                if(currentRoleId && countryId) {
                    this.inputEditRoleModal.selectpicker("val", currentRoleId).selectpicker("refresh");
                    this.inputEditRoleCountry.selectpicker("val", countryId).trigger("change");
                }
                $("div#editUserRoleModal").modal("show");
                $("div#editUserRoleModalLabel").empty().html(` <b>Email: </b>${email}<br /><b>Name: </b>${userName}`);
                // here add more fields for province and district selection into the modal
                this.submitEditRole.unbind("click").on("click", () =>  this.updateRoleId(userId));
            });
        })
        .then(this.closeFormModals)
        // .catch(err => {
        //     this.pageAlert(err.responseJSON.message, 0);
        //     console.error(err);
        // })
        .finally(this.stopWaiting);
    }


    displayRoleMapFilter = (roleId, countryId, userId) => {
        // country is must, assign country if available
        console.log(roleId, countryId, userId)
        this.getApi(this.authHeader, `auth/manage?user_id=${userId}`)
        .then(response => {
            switch(true){
                case roleId == "3":
                    this.fgEditRoleProvince.show();
                    this.fgEditRoleDistrict.hide();
                    this.fillProvinceOptions(countryId, response.data.role_province_ids);
                    break;
                case roleId == "4":
                    this.fgEditRoleProvince.hide();
                    this.fgEditRoleDistrict.show();
                    this.fillDistrictOptions(countryId, response.data.role_district_ids);
                    break;
                default:
                    this.fgEditRoleProvince.hide();
                    this.fgEditRoleDistrict.hide();
                    break;
            }
        })
        .catch(err => {
            this.pageAlert(err.responseJSON.message, 0);
            console.error(err);
        })
        .finally(this.stopWaiting);
        
    }


    fillProvinceOptions = (countryId, provinceIds) => {
        let provinceOptions = this.roleProvinceList.filter(a => a.country_id == countryId);
        if(provinceOptions.length){
            // this.roleMapFieldsetProvince.empty().html(this.formGroupProvince);
            this.fgEditRoleProvince.show();
            let optionsHtml = provinceOptions.map(a => {
                return `<option value="${a.province_id}">${a.province}</option>`
            }).join("\n");
            $("select#input-edit-role-province").empty().html(optionsHtml);
            $("select#input-edit-role-province").selectpicker(this.selectpickerCommonOptions);
            $("select#input-edit-role-province").selectpicker("refresh");
            
            if(provinceIds.length){
                $("select#input-edit-role-province").selectpicker("val", provinceIds)
                $("select#input-edit-role-province").selectpicker("refresh");
            }
            // $("select#input-edit-role-province-modal").addClass("form-control");
        } else this.fgEditRoleProvince.hide();;
    }

    fillDistrictOptions = (countryId, districtIds) => {
        let districtOptions = this.roleDistrictList.filter(a => a.country_id == countryId);
        if(districtOptions.length){
            // this.roleMapFieldsetDistrict.empty().html(this.formGroupDistrict);
            this.fgEditRoleDistrict.show();
            let uqProvinceIds = this.uqArray(districtOptions.map(a => a.province_id));
            let optionsHtml = uqProvinceIds.map(a => {
                let provinceName = this.roleProvinceList.find(b => b.province_id == a).province;
                let districtOptionsHtml = districtOptions.filter(b => b.province_id == a).map(b => {
                    return `<option value="${b.district_id}">${b.district}</option>`
                }).join("\n");
                return `<optgroup label="${provinceName}">${districtOptionsHtml}</optgroup>`
            }).join("\n");
            $("select#input-edit-role-district").empty().html(optionsHtml);
            $("select#input-edit-role-district").selectpicker(this.selectpickerCommonOptions);
            if(districtIds.length) $("select#input-edit-role-district").selectpicker("val", districtIds);
            // $("select#input-edit-role-district-modal").addClass("form-control");;
        } else this.fgEditRoleDistrict.hide();
    }

    closeFormModals = () => {
        this.closeAddForm.on("click", () => $("div#addUserModal").modal("hide"));
        this.closeEditForm.on("click", () => $("div#editUserModal").modal("hide"));
        this.closeResetPasswordForm.on("click", () => $("div#resetPasswordModal").modal("hide"));
        this.closeUserRoleEditForm.on("click", () => $("div#editUserRoleModal").modal("hide"));
    }

    addNewUser = () => {
        let reqBody = {
            "full_name": this.inputAddName.val() || null,
            "origin_country_id": this.inputAddOriginCountry.selectpicker("val") || null,
            // "country_id": this.inputAddCountry.selectpicker("val") || null,
            "email": this.inputAddEmail.val() || null,
            "password": this.inputAddPassword.val() || null,
            "organization": this.inputAddOrganization.val() || null,
            "designation": this.inputAddDesignation.val() || null,
            "gender": this.inputAddGender.val() || null,
            "organization_category": this.inputAddOrganizationCategory.val() || null,
            "phone": this.inputAddPhone.val() || null,
            "reason": this.inputAddReason.val() || null,
        }
        this.postApi(reqBody, this.authHeader, "auth/manage")
        .then(response => {
            if(response.success){
                this.pageAlert(response.message, 1);
                this.getUsersList();
                // clear fields
                this.inputAddName.val("");
                this.inputAddOriginCountry.selectpicker("val", "");
                this.inputAddEmail.val("");
                this.inputAddPassword.val("");
                this.inputAddOrganization.val("");
                this.inputAddDesignation.val("");
                this.inputAddGender.selectpicker("val", "");
                this.inputAddOrganizationCategory.val("");
                this.inputAddPhone.val("");
                this.inputAddReason.val("");
                $("div#addUserModal").modal("hide");
            }
        })
        .catch(err => {
            this.pageAlert(err.responseJSON.message, 0);
            console.error(err)
        })
        .finally(this.stopWaiting);
    }

    updateUserStatus = (userId, purpose) => {
        this.patchApi({"purpose": purpose}, this.authHeader, `auth/manage?user_id=${userId}`)
        .then(response => {
            if(response.success){
                this.pageAlert(response.message, 1);
                this.getUsersList();
            }
        })
        .catch(err => {
            this.pageAlert(err.responseJSON.message, 0);
            console.error(err);
        })
        .finally(this.stopWaiting);
    }

    getUserData = (userId) => {
        this.getApi(this.authHeader, `auth/manage?user_id=${userId}`)
        .then(response => {
            if(response.success){
                this.inputEditName.val(response.data.name);
                this.inputEditEmail.val(response.data.email);
                // this.inputEditCountry.selectpicker("val", response.data.country_id);
                this.inputEditOriginCountry.selectpicker("val", response.data.origin_country_id);
                this.inputEditOrganization.val(response.data.organization);
                this.inputEditDesignation.val(response.data.designation);
                this.inputEditOrganizationCategory.val(response.data.organization_category);
                this.inputEditPhone.val(response.data.phone);
                this.inputEditGender.selectpicker("val", response.data.gender);
                this.inputEditReason.val(response.data.reason);
                $("div#editUserModal").modal("show");
                this.submitEdit.unbind("click").on("click", () => {
                    this.updateUserData(userId)
                })
            }
        })
        .catch(err => {
            this.pageAlert(err.responseJSON.message, 0);
            console.error(err);
        })
        .finally(this.stopWaiting);
    }

    updateRoleId = (userId) => {
        let chosenRoleId = this.inputEditRoleModal.selectpicker("val");
        let reqBody = {
            "purpose": "update_role",
            "role_id": chosenRoleId,
            "country_id": this.inputEditRoleCountry.selectpicker("val") || null, 
            "role_province_ids": chosenRoleId == 3 
                ? $("select#input-edit-role-province")?.selectpicker("val").map(a => parseInt(a)) || [] 
                : [],
            "role_district_ids": chosenRoleId == 4 
                ? $("select#input-edit-role-district")?.selectpicker("val").map(a => parseInt(a)) || [] 
                : [],
        }; 

        this.patchApi(reqBody, this.authHeader, `auth/manage?user_id=${userId}`)
        .then(response => {
            if(response.success){
                this.pageAlert(response.message, 1);
                $("div#editUserRoleModal").modal("hide");
                this.getUsersList();
            }
        })
        .catch(err => {
            this.pageAlert(err.responseJSON.message, 0);
            console.error(err);
        })
        .finally(this.stopWaiting);
    }

    updateUserData = (userId) => {
        let reqBody = {
            "purpose": "edit",
            "form_data": {
                "full_name": this.inputEditName.val() || null,
                "origin_country_id": this.inputEditOriginCountry.selectpicker("val") || null,
                // "country_id": this.inputEditCountry.val() || null,
                "email": this.inputEditEmail.val() || null,
                "organization": this.inputEditOrganization.val() || null,
                "designation": this.inputEditDesignation.val() || null,
                "gender": this.inputEditGender.val() || null,
                "organization_category": this.inputEditOrganizationCategory.val() || null,
                "phone": this.inputEditPhone.val() || null,
                "reason": this.inputEditReason.val() || null,
            }
        }
        this.patchApi(reqBody, this.authHeader, `auth/manage?user_id=${userId}`)
        .then(response => {
            if(response.success){
                this.pageAlert(response.message, 1);
                $("div#editUserModal").modal("hide");
                this.getUsersList();
            }
        })
        .catch(err => {
            this.pageAlert(err.responseJSON.message, 0);
            console.error(err);
        })
        .finally(this.stopWaiting);
    }

    resetUserPassword = (userId, newPassword) => {
        let reqBody = {
            "purpose": "reset_password",
            "new_password": newPassword
        }
        this.patchApi(reqBody, this.authHeader, `auth/manage?user_id=${userId}`)
        .then(response => {
            if(response.success){
                this.pageAlert(response.message, 1);
                $("div#resetPasswordModal").modal("hide");
            }
        })
        .catch(err => {
            this.pageAlert(err.responseJSON.message, 0);
            console.error(err);
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
