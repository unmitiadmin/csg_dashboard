window.addEventListener("load", (event) => {
    const getCookies = () => {
        return document.cookie.split(';').map(d => {
            const cookie = d.split('=');
            const key = cookie[0] && typeof cookie[0] == 'string' ? cookie[0].trim() : cookie[0];
            let value = cookie[1] && typeof cookie[1] == 'string' ? cookie[1].trim() : cookie[1];
            if (value) {
                const map = { true: true, false: false, null: null, undefined: undefined };
                if (value in map) value = map[value];
            }
            return { [key]: value }
        }).reduce((a, b) => Object.assign(a, b), {});
    }

    const startWaiting = () => {
        let loadingIcon = `<div class="text-center"><div class="fa-3x mb-1"><i class="fa fa-spinner fa-pulse" aria-hidden="true"></i></div><span>Loading</span></div>`;
        $("#loading-modal-container").empty().html(loadingIcon);
        $('#loading-modal').modal('show');
    }

    const stopWaiting = () => {
        $("#loading-modal-container").empty();
        $("#loading-modal").modal("hide");
    }

    const pageNavAlert = (text, success) => {
        let alertIcon = success !== null || success !== undefined
            ? (success
                ? `<img src="assets/images/success.png"><h5 class="success-text-popup my-2">SUCCESS!</h5>`
                : `<img src="assets/images/success-false.png"><h5 class="success-text-popup my-2">ERROR!</h5>`)
            : "";
    }

    const checkAuthPage = () => {
        const loginRequiredPages = [
            "project_tracker.html",
            "catalog_adaptation.html",
            "catalog_mitigation.html",
            "catalog_crosscutting.html",
            "geospatial.html",
            "mande_tool.html",
            // all reports pages - add edit - project, outcome, output, report redirect to index.html
            "adaptation_catalog.html",
        ];
        // const currentPage = location.href.split('/').findLast(d => d);
        const currentPageWithoutParams = (location.pathname || '').split('/').filter(Boolean).pop();
        const currentPage = (currentPageWithoutParams || '').split('?')[0];
        return loginRequiredPages.includes(currentPage);
    }


    const cookies = getCookies();
    const isAuthPage = checkAuthPage();

    const userProfileArea = ` <li class="nav-item">
        <div class="dropdown">
            <button class="btn btn-login btn-secondary dropdown-toggle" type="button"
                id="dropdownMenuButton1" data-toggle="dropdown" data-toggle="dropdown" aria-expanded="false">
                <img src="./assets/images/login-user.svg">
            </button>
            <ul class="dropdown-menu login-user mt-3" aria-labelledby="dropdownMenuButton1">
            <li id="user-email-label"></li>
            <!--li><a class="dropdown-item" href="profile.html">Profile</a></li>
            <li id="user-management-link"> 
                <a class="dropdown-item"  href="user_management.html">User Management</a>
                <a class="dropdown-item"  href="roles_capabilities.html">Roles and Capabilities</a>
            </li -->
            <li><a class="dropdown-item" id="link-logout" href="index.html">Log Out</a></li>
            </ul>
        </div>
    </li>`;

    const countryFlagArea = () => {
        let style = cookies.isLoggedIn && cookies.userRoleId != 1 ? "display: block;" : "display: none;";
        let imagePath = cookies.isLoggedIn && cookies.userRoleId != 1 ? `./assets/flag_icons/${cookies.initialCountryId}.png` : null;
        return `<li class="nav-item ms-2 mt-2 ">
          <img src="${imagePath} " height="35" width="35" id="user-country-icon" style="${style}"/>
        </li>`;
    }

    const loginArea = `<li class="nav-item">
        <button id="nav-login-btn" class="btn btn-login">Login</button>
    </li>`;


    const headerContent = `<nav class="navbar navbar-expand-lg navbar-dark">
        <a class="navbar-brand text-white" href="index.html">
            <div class="d-flex align-items-center">
                <div><img src="./assets/images/logo_white.webp" alt="Logo" height="40px"></div>
                <div class="vl"></div>
                <div>
                    <p class="mb-0"><small>INITIATIVE</small></p>
                    <p class="mb-0">Climate Resilience</p>
                </div>
            </div>
        </a>
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav"
            aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav ml-auto align-items-center">
                <li class="nav-item"><a class="nav-link" href="#">Home</a></li>
                <li class="nav-item"><a class="nav-link" href="#">About Us</a></li>
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" id="modulesDropdown" role="button"
                        data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                        Modules
                    </a>
                    <div class="dropdown-menu modules" aria-labelledby="modulesDropdown">
                        <a class="dropdown-item" href="index.html"><img class="pr-2" pr-2
                                src="./assets/images/element-3.png" alt=""> Country Overview</a>
                        <a class="dropdown-item" href="#"><img class="pr-2" src="./assets/images/element-3.png"
                                alt=""> Climate Outlook</a>
                        <a class="dropdown-item" href="#"><img class="pr-2" src="./assets/images/element-3.png"
                                alt=""> Project Tracker</a>
                        <a class="dropdown-item" href="#"><img class="pr-2" src="./assets/images/element-3.png"
                                alt=""> Geo Intelligence Tool</a>
                        <a class="dropdown-item" href="#"><img class="pr-2" src="./assets/images/element-3.png"
                                alt=""> Monitoring and Evaluation</a>
                        <a class="dropdown-item" href="#"><img class="pr-2" src="./assets/images/element-3.png"
                                alt=""> Development Indicator</a>
                        <a class="dropdown-item" href="#"><img class="pr-2" src="./assets/images/element-3.png"
                                alt=""> Adaption Catalog</a>
                        <a class="dropdown-item" href="#"><img class="pr-2" src="./assets/images/element-3.png"
                                alt=""> Investment Portfolio Planning</a>
                        <a class="dropdown-item" href="#"><img class="pr-2" src="./assets/images/element-3.png"
                                alt=""> Nationally Determined Contributions</a>
                    </div>
                </li>
                <li class="nav-item"><a class="nav-link" href="#">Resources</a></li>
            </ul>
            <ul class="navbar-nav ml-auto align-items-center">
                <li class="nav-item"><a class="nav-link" href="#">🌐 English</a></li>
                ${cookies.jwt ? userProfileArea : loginArea}
                
                <li class="nav-item">
                    <button class="btn btn-explore">Explore AI Agent</button>
                </li>
            </ul>
        </div>
    </nav>
    <!-- login/register modal -->
    <div class="modal fade" id="login-modal" tabindex="-1" aria-labelledby="login-modal-label" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-xl">
            <div class="modal-content">
                <div class="modal-body p-2">
                    <div class="row">
                        <!-- Left Side Image Section -->
                        <div class="col-lg-6 d-none d-lg-block">
                            <div class="login-image-fit p31px" style="
                                    border-radius: 20px 0 0 10px;
                                    background: linear-gradient(0deg, rgba(0, 0, 0, 0.20) 0%, rgba(0, 0, 0, 0.20) 100%), url(./assets/images/login-bg.png) lightgray 50% / cover no-repeat;
                                    background-repeat: no-repeat;
                                    background-position: center;
                                    background-size: cover;
                                    min-height: 500px;">
                                <div class="card">
                                    <div class="card-body">
                                        <h6>Please Login to Access the following <br>features:</h6>
                                        <ul class="list-group loginList border-0">
                                            <li class="list-group-item"><span class="pr-2"><img src="./assets/images/sun.png"></span> Project Tracker</li>
                                            <li class="list-group-item"><span class="pr-2"><img src="./assets/images/sun.png"></span> Geo Intelligence Tool</li>
                                            <li class="list-group-item"><span class="pr-2"><img src="./assets/images/sun.png"></span> Monitoring and Evaluation</li>
                                            <li class="list-group-item"><span class="pr-2"><img src="./assets/images/sun.png"></span> Development Indicator</li>
                                            <li class="list-group-item"><span class="pr-2"><img src="./assets/images/sun.png"></span> Adaption Catalog</li>
                                            <li class="list-group-item"><span class="pr-2"><img src="./assets/images/sun.png"></span> Investment Portfolio Planning</li>
                                            <li class="list-group-item"><span class="pr-2"><img src="./assets/images/sun.png"></span> Nationally Determined Contributions</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Right Side Form -->
                        <div class="col-lg-6  border-radius-20px">
                            <div class="p-5">
                                <ul class="nav nav-tabs login_tabs border-0 nav-fill" role="tablist">
                                    <li class="nav-item">
                                        <a class="nav-link active" id="login-tab" data-toggle="tab" href="#login"
                                            role="tab">Login</a>
                                    </li>
                                    <li class="nav-item">
                                        <a class="nav-link" id="register-tab" data-toggle="tab" href="#register"
                                            role="tab">Register</a>
                                    </li>
                                </ul>
                                <div class="tab-content mt-4">
                                    <!-- Login Tab -->
                                    <div class="tab-pane fade show active" id="login" role="tabpanel">
                                        <div class="form-group">
                                            <input type="text" class="form-control logInInput" placeholder="Email/ID" id="input-login-email">
                                        </div>
                                        <div class="form-group">
                                            <input type="password" class="form-control logInInput" placeholder="Password" id="input-login-password">
                                        </div>
                                        <button class="btn btn-login1 w-100 text-white mt-3" id="submit-login">Login</button>

                                        <div class="d-flex justify-content-between align-items-center mt-2">
                                            <!-- div>
                                                <div class="form-check">
                                                    <input type="checkbox" class="form-check-input" id="exampleCheck1"  checked>
                                                    <label class="form-check-label" for="exampleCheck1">Keep me signed in</label>
                                                </div>
                                            </div -->
                                            <div><a href="#" class="font-14px"><strong>Forgot Password?</strong></a>
                                            </div>
                                        </div>

                                        <div class="d-flex justify-content-center align-items-center">
                                            <p class="mb-0 font-14px accountPos">Don’t have an account? <a href="#"
                                                    class="mb-0 font-14px"><strong>Register</strong></a></p>
                                        </div>
                                    </div>


                                    <!-- Register Tab -->
                                    <div class="tab-pane fade" id="register" role="tabpanel">
                                        <div class="modal-content border-0">
                                            <!-- Step Indicator -->
                                            <div class="register-steps text-center mb-4" id="register-steps">
                                                <div class="step-line"></div>
                                                <div class="step-circle step-active">1</div>
                                                <div class="step-circle">2</div>
                                                <div class="step-circle">3</div>
                                            </div>

                                            <!-- Step 1 -->
                                            <div class="register-step step-1 active">
                                                <div class="form-group">
                                                    <input type="text" class="form-control logInInput" placeholder="Name" id="input-registration-name">
                                                </div>
                                                <div class="form-group">
                                                    <input type="email" class="form-control logInInput" placeholder="Email" id="input-registration-email">
                                                </div>
                                                 <div class="form-group">
                                                    <input type="text" class="form-control logInInput" placeholder="Mobile Number" id="input-registration-phone">
                                                </div>
                                                <button class="btn btn-login1 next-step w-100 mt-3">Next</button>
                                            </div>

                                            <!-- Step 2 -->
                                            <div class="register-step step-2">
                                                <div class="form-group">
                                                    <input type="text" class="form-control logInInput" placeholder="Organization" id="input-registration-organization">
                                                </div>
                                                <div class="form-group">
                                                    <input type="text" class="form-control logInInput" placeholder="Designation" id="input-registration-designation" />
                                                </div>
                                                 <div class="form-group">
                                                    <input type="text" class="form-control logInInput" placeholder="Organization Category" id="input-registration-organization-category">
                                                </div>
                                                <button class="btn btn-secondary prev-step">Back</button>
                                                <button class="btn btn-login1 float-right next-step">Next</button>
                                            </div>

                                            <!-- Step 3 -->
                                            <div class="register-step step-3">
                                                 <div class="form-group">
                                                   <select class="form-control logInInput1" id="input-registration-origin-country">
                                                        <option value="">Select Country</option>
                                                        <option value="1">Andorra</option>
                                                        <option value="2">United Arab Emirates</option>
                                                        <option value="3">Afghanistan</option>
                                                        <option value="4">Antigua and Barbuda</option>
                                                        <option value="5">Anguilla</option>
                                                        <option value="6">Albania</option>
                                                        <option value="7">Armenia</option>
                                                        <option value="8">Netherlands Antilles</option>
                                                        <option value="9">Angola</option>
                                                        <option value="10">Antarctica</option>
                                                        <option value="11">Argentina</option>
                                                        <option value="12">American Samoa</option>
                                                        <option value="13">Austria</option>
                                                        <option value="14">Australia</option>
                                                        <option value="15">Aruba</option>
                                                        <option value="16">Azerbaijan</option>
                                                        <option value="17">Bosnia and Herzegovina</option>
                                                        <option value="18">Barbados</option>
                                                        <option value="19">Bangladesh</option>
                                                        <option value="20">Belgium</option>
                                                        <option value="21">Burkina Faso</option>
                                                        <option value="22">Bulgaria</option>
                                                        <option value="23">Bahrain</option>
                                                        <option value="24">Burundi</option>
                                                        <option value="25">Benin</option>
                                                        <option value="26">Bermuda</option>
                                                        <option value="27">Brunei</option>
                                                        <option value="28">Bolivia</option>
                                                        <option value="29">Brazil</option>
                                                        <option value="30">Bahamas</option>
                                                        <option value="31">Bhutan</option>
                                                        <option value="32">Bouvet Island</option>
                                                        <option value="33">Botswana</option>
                                                        <option value="34">Belarus</option>
                                                        <option value="35">Belize</option>
                                                        <option value="36">Canada</option>
                                                        <option value="37">Cocos [Keeling] Islands</option>
                                                        <option value="38">Congo [DRC]</option>
                                                        <option value="39">Central African Republic</option>
                                                        <option value="40">Congo [Republic]</option>
                                                        <option value="41">Switzerland</option>
                                                        <option value="42">Coste De Ivorie</option>
                                                        <option value="43">Cook Islands</option>
                                                        <option value="44">Chile</option>
                                                        <option value="45">Cameroon</option>
                                                        <option value="46">China</option>
                                                        <option value="47">Colombia</option>
                                                        <option value="48">Costa Rica</option>
                                                        <option value="49">Cuba</option>
                                                        <option value="50">Cape Verde</option>
                                                        <option value="51">Christmas Island</option>
                                                        <option value="52">Cyprus</option>
                                                        <option value="53">Czech Republic</option>
                                                        <option value="54">Germany</option>
                                                        <option value="55">Djibouti</option>
                                                        <option value="56">Denmark</option>
                                                        <option value="57">Dominica</option>
                                                        <option value="58">Dominican Republic</option>
                                                        <option value="59">Algeria</option>
                                                        <option value="60">Ecuador</option>
                                                        <option value="61">Estonia</option>
                                                        <option value="62">Egypt</option>
                                                        <option value="63">Western Sahara</option>
                                                        <option value="64">Eritrea</option>
                                                        <option value="65">Spain</option>
                                                        <option value="66">Ethiopia</option>
                                                        <option value="67">Finland</option>
                                                        <option value="68">Fiji</option>
                                                        <option value="69">Falkland Islands [Islas Malvinas]</option>
                                                        <option value="70">Micronesia</option>
                                                        <option value="71">Faroe Islands</option>
                                                        <option value="72">France</option>
                                                        <option value="73">Gabon</option>
                                                        <option value="74">United Kingdom</option>
                                                        <option value="75">Grenada</option>
                                                        <option value="76">Georgia</option>
                                                        <option value="77">French Guiana</option>
                                                        <option value="78">Guernsey</option>
                                                        <option value="79">Ghana</option>
                                                        <option value="80">Gibraltar</option>
                                                        <option value="81">Greenland</option>
                                                        <option value="82">Gambia</option>
                                                        <option value="83">Guinea</option>
                                                        <option value="84">Guadeloupe</option>
                                                        <option value="85">Equatorial Guinea</option>
                                                        <option value="86">Greece</option>
                                                        <option value="87">South Georgia and the South Sandwich Islands</option>
                                                        <option value="88">Guatemala</option>
                                                        <option value="89">Guam</option>
                                                        <option value="90">Guinea-Bissau</option>
                                                        <option value="91">Guyana</option>
                                                        <option value="92">Gaza Strip</option>
                                                        <option value="93">Hong Kong</option>
                                                        <option value="94">Heard Island and McDonald Islands</option>
                                                        <option value="95">Honduras</option>
                                                        <option value="96">Croatia</option>
                                                        <option value="97">Haiti</option>
                                                        <option value="98">Hungary</option>
                                                        <option value="99">Indonesia</option>
                                                        <option value="100">Ireland</option>
                                                        <option value="101">Israel</option>
                                                        <option value="102">Isle of Man</option>
                                                        <option value="103">India</option>
                                                        <option value="104">British Indian Ocean Territory</option>
                                                        <option value="105">Iraq</option>
                                                        <option value="106">Iran</option>
                                                        <option value="107">Iceland</option>
                                                        <option value="108">Italy</option>
                                                        <option value="109">Jersey</option>
                                                        <option value="110">Jamaica</option>
                                                        <option value="111">Jordan</option>
                                                        <option value="112">Japan</option>
                                                        <option value="113">Kenya</option>
                                                        <option value="114">Kyrgyzstan</option>
                                                        <option value="115">Cambodia</option>
                                                        <option value="116">Kiribati</option>
                                                        <option value="117">Comoros</option>
                                                        <option value="118">Saint Kitts and Nevis</option>
                                                        <option value="119">North Korea</option>
                                                        <option value="120">South Korea</option>
                                                        <option value="121">Kuwait</option>
                                                        <option value="122">Cayman Islands</option>
                                                        <option value="123">Kazakhstan</option>
                                                        <option value="124">Laos</option>
                                                        <option value="125">Lebanon</option>
                                                        <option value="126">Saint Lucia</option>
                                                        <option value="127">Liechtenstein</option>
                                                        <option value="128">Sri Lanka</option>
                                                        <option value="129">Liberia</option>
                                                        <option value="130">Lesotho</option>
                                                        <option value="131">Lithuania</option>
                                                        <option value="132">Luxembourg</option>
                                                        <option value="133">Latvia</option>
                                                        <option value="134">Libya</option>
                                                        <option value="135">Morocco</option>
                                                        <option value="136">Monaco</option>
                                                        <option value="137">Moldova</option>
                                                        <option value="138">Montenegro</option>
                                                        <option value="139">Madagascar</option>
                                                        <option value="140">Marshall Islands</option>
                                                        <option value="141">Macedonia [FYROM]</option>
                                                        <option value="142">Mali</option>
                                                        <option value="143">Myanmar [Burma]</option>
                                                        <option value="144">Mongolia</option>
                                                        <option value="145">Macau</option>
                                                        <option value="146">Northern Mariana Islands</option>
                                                        <option value="147">Martinique</option>
                                                        <option value="148">Mauritania</option>
                                                        <option value="149">Montserrat</option>
                                                        <option value="150">Malta</option>
                                                        <option value="151">Mauritius</option>
                                                        <option value="152">Maldives</option>
                                                        <option value="153">Malawi</option>
                                                        <option value="154">Mexico</option>
                                                        <option value="155">Malaysia</option>
                                                        <option value="156">Mozambique</option>
                                                        <option value="157">Namibia</option>
                                                        <option value="158">New Caledonia</option>
                                                        <option value="159">Niger</option>
                                                        <option value="160">Norfolk Island</option>
                                                        <option value="161">Nigeria</option>
                                                        <option value="162">Nicaragua</option>
                                                        <option value="163">Netherlands</option>
                                                        <option value="164">Norway</option>
                                                        <option value="165">Nepal</option>
                                                        <option value="166">Nauru</option>
                                                        <option value="167">Niue</option>
                                                        <option value="168">New Zealand</option>
                                                        <option value="169">Oman</option>
                                                        <option value="170">Panama</option>
                                                        <option value="171">Peru</option>
                                                        <option value="172">French Polynesia</option>
                                                        <option value="173">Papua New Guinea</option>
                                                        <option value="174">Philippines</option>
                                                        <option value="175">Pakistan</option>
                                                        <option value="176">Poland</option>
                                                        <option value="177">Saint Pierre and Miquelon</option>
                                                        <option value="178">Pitcairn Islands</option>
                                                        <option value="179">Puerto Rico</option>
                                                        <option value="180">Palestinian Territories</option>
                                                        <option value="181">Portugal</option>
                                                        <option value="182">Palau</option>
                                                        <option value="183">Paraguay</option>
                                                        <option value="184">Qatar</option>
                                                        <option value="185">Réunion</option>
                                                        <option value="186">Romania</option>
                                                        <option value="187">Serbia</option>
                                                        <option value="188">Russia</option>
                                                        <option value="189">Rwanda</option>
                                                        <option value="190">Saudi Arabia</option>
                                                        <option value="191">Solomon Islands</option>
                                                        <option value="192">Seychelles</option>
                                                        <option value="193">Sudan</option>
                                                        <option value="194">Sweden</option>
                                                        <option value="195">Singapore</option>
                                                        <option value="196">Saint Helena</option>
                                                        <option value="197">Slovenia</option>
                                                        <option value="198">Svalbard and Jan Mayen</option>
                                                        <option value="199">Slovakia</option>
                                                        <option value="200">Sierra Leone</option>
                                                        <option value="201">San Marino</option>
                                                        <option value="202">Senegal</option>
                                                        <option value="203">Somalia</option>
                                                        <option value="204">Suriname</option>
                                                        <option value="205">São Tomé and Príncipe</option>
                                                        <option value="206">El Salvador</option>
                                                        <option value="207">Syria</option>
                                                        <option value="208">Swaziland</option>
                                                        <option value="209">Turks and Caicos Islands</option>
                                                        <option value="210">Chad</option>
                                                        <option value="211">French Southern Territories</option>
                                                        <option value="212">Togo</option>
                                                        <option value="213">Thailand</option>
                                                        <option value="214">Tajikistan</option>
                                                        <option value="215">Tokelau</option>
                                                        <option value="216">Timor-Leste</option>
                                                        <option value="217">Turkmenistan</option>
                                                        <option value="218">Tunisia</option>
                                                        <option value="219">Tonga</option>
                                                        <option value="220">Turkey</option>
                                                        <option value="221">Trinidad and Tobago</option>
                                                        <option value="222">Tuvalu</option>
                                                        <option value="223">Taiwan</option>
                                                        <option value="224">Tanzania</option>
                                                        <option value="225">Ukraine</option>
                                                        <option value="226">Uganda</option>
                                                        <option value="227">U.S. Minor Outlying Islands</option>
                                                        <option value="228">United States</option>
                                                        <option value="229">Uruguay</option>
                                                        <option value="230">Uzbekistan</option>
                                                        <option value="231">Vatican City</option>
                                                        <option value="232">Saint Vincent and the Grenadines</option>
                                                        <option value="233">Venezuela</option>
                                                        <option value="234">British Virgin Islands</option>
                                                        <option value="235">U.S. Virgin Islands</option>
                                                        <option value="236">Vietnam</option>
                                                        <option value="237">Vanuatu</option>
                                                        <option value="238">Wallis and Futuna</option>
                                                        <option value="239">Samoa</option>
                                                        <option value="240">Kosovo</option>
                                                        <option value="241">Yemen</option>
                                                        <option value="242">Mayotte</option>
                                                        <option value="243">South Africa</option>
                                                        <option value="244">Zambia</option>
                                                        <option value="245">Zimbabwe</option>
                                                   </select>
                                                </div>
                                                <div class="form-group">
                                                    <select class="form-control logInInput1" id="input-registration-gender">
                                                        <option>Select Gender</option>
                                                        <option value="Male">Male</option>
                                                        <option value="Female">Female</option>
                                                   </select>
                                                </div>
                                                 <div class="form-group">
                                                    <input type="text" class="form-control logInInput" placeholder="Reason to use the tool" id="input-registration-reason">
                                                </div>
                                                <div class="form-group">
                                                    <input type="text" class="form-control logInInput" placeholder="Create a password" id="input-registration-password">
                                                </div>
                                                <button class="btn btn-secondary prev-step">Back</button>
                                                <button class="btn btn-login1 float-right" id="submit-register">Submit</button>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>            
        </div>
    </div>`;


    const register = () => {
        let reqBody = {
            "full_name": document.querySelector("input#input-registration-name")?.value || null,
            "origin_country_id": document.querySelector("select#input-registration-origin-country")?.value || null,
            "email": document.querySelector("input#input-registration-email")?.value || null,
            "password": document.querySelector("input#input-registration-password")?.value || null,
            "organization": document.querySelector("input#input-registration-organization")?.value || null,
            "designation": document.querySelector("input#input-registration-designation")?.value || null,
            "organization_category": document.querySelector("input#input-registration-organization-category")?.value || null,
            "phone": document.querySelector("input#input-registration-phone")?.value || null,
            "gender": document.querySelector("select#input-registration-gender")?.value || null,
            "reason": document.querySelector("input#input-registration-reason")?.value || null,
        }
        startWaiting();
        fetch(`${apiUrl}/auth/register`, {
            method: 'POST',
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            },
            body: JSON.stringify(reqBody),
        }).then(response => response.json())
            .then(response => {
                if (response.success) {
                    pageNavAlert(`User with email ${reqBody.email} is successfully registered`, 1);
                    document.querySelector("input#input-registration-name").value = ""
                    document.querySelector("select#input-registration-origin-country").value = ""
                    document.querySelector("input#input-registration-email").value = ""
                    document.querySelector("input#input-registration-password").value = ""
                    document.querySelector("input#input-registration-organization").value = ""
                    document.querySelector("input#input-registration-designation").value = ""
                    document.querySelector("input#input-registration-organization-category").value = ""
                    document.querySelector("input#input-registration-phone").value = ""
                    document.querySelector("select#input-registration-gender").value = ""
                    document.querySelector("input#input-registration-reason").value = ""
                    $("button.nav-link#login-tab").trigger("click");
                } else {
                    pageNavAlert(response.message, 0)
                }
            })
            .catch(err => {
                pageNavAlert(err.responseJSON.message, 0);
                console.error(err);
            })
            .finally(() => stopWaiting());
    }

    const handleOperation = () => {
        if (cookies.jwt) {
            document.querySelector("#link-logout").addEventListener('click', () => {
                const countryVal = document.querySelector('select#filter-country').value;
                document.cookie = `countryId=${countryVal}`;
                document.cookie = `jwt=null`;
                document.cookie = `userEmail=null`;
                document.cookie = `isLoggedIn=false`;
                document.cookie = `userRoleId=null`;
                document.cookie = `initialCountryId=null`;
            })
        } else {
            document.querySelector('button#submit-register').addEventListener('click', register)
            document.querySelector('button#nav-login-btn').addEventListener('click', () => {
                const loginModal = $("div#login-modal");
                loginModal.modal("show");
                document.querySelector('#redirectionLink').value = '';
            });
            document.querySelector('#submit-login').addEventListener('click', () => {
                let reqBody = {
                    "email": $("input#input-login-email").val() || null,
                    "password": $("input#input-login-password").val() || null,
                };
                let countryId = document.querySelector('select#filter-country').value;
                startWaiting();
                fetch(`${apiUrl}/auth/login`, {
                    method: 'POST',
                    headers: {
                        "Content-type": "application/json; charset=UTF-8"
                    },
                    body: JSON.stringify(reqBody),
                }).then(response => response.json())
                    .then(response => {
                        if (response.success) {
                            const redirectionLink = document.querySelector('#redirectionLink')?.value || '';
                            document.cookie = `userEmail=${response.email}`;
                            document.cookie = `jwt=${response.jwt}`;
                            document.cookie = `isLoggedIn=true`;
                            document.cookie = `countryId=${countryId}`;
                            document.cookie = `initialCountryId=${response.initial_country_id === null ? "" : response.initial_country_id}`;
                            document.cookie = `userRoleId=${response.userRoleId}`;
                            $("li#user-email-label").empty().html(response.email);
                            if (redirectionLink) {
                                window.location.replace(`${redirectionLink}.html`)
                            } else {
                                location.reload();
                            }
                        } else {
                            throw new Error(response.message);
                        }
                    }).catch(err => {
                        $("li#user-email-label").empty();
                        pageNavAlert(`Unable to login - ${err.message}`, 0);
                        console.error(err);
                    })
                    .finally(() => stopWaiting());
            });

            // for step wise methods 
            $(document).ready(function () {
                let currentStep = 1;
                function showStep(step) {
                    $(".register-step").removeClass("active");
                    $(".step-" + step).addClass("active");
                    $(".step-circle").removeClass("step-active");
                    $(".step-circle:nth-child(" + (step + 1) + ")").addClass("step-active");
                }
                $(".next-step").click(function () {
                    if (currentStep < 3) {
                        currentStep++;
                        showStep(currentStep);
                    }
                });
                $(".prev-step").click(function () {
                    if (currentStep > 1) {
                        currentStep--;
                        showStep(currentStep);
                    }
                });
            });
        }
    }


    document.querySelector("#headerContainer").innerHTML = headerContent;
    handleOperation();
    if (isAuthPage && !cookies.jwt) {
        const loginModal = $("div#login-modal");
        loginModal.modal("show");
    }
})