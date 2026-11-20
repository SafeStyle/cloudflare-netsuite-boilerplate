/*
 * The pages shown inside the simulated browser. Each function returns HTML for the
 * browser's content area. They are illustrations of the real sites, drawn with plain
 * shapes and text: no logos, images or live data. Styled in screens.css.
 *
 * The app's own pages (S.app*) mirror app/routes/*.tsx. When one of those pages
 * changes, change it here too. See docs/walkthrough.md.
 */
"use strict";
(function () {
  const WT = window.WT;
  const S = WT.screens;
  const esc = WT.esc;

  // Everything shown is made up, except OWNER and REPO: where the code really is.
  const D = (WT.data = {
    OWNER: "SafeStyle",
    REPO: "cloudflare-netsuite-boilerplate",
    NODE: "v24.11.1",
    NPM: "11.6.2",
    USER: "Alex Taylor",
    EMAIL: "alex.taylor@example.com",
    COMPANY: "Example Trading Co",
    ACCOUNT: "1234567_SB1",
    NS_HOST: "1234567-sb1.app.netsuite.com",
    INTEGRATION: "Cloudflare demo",
    ROLE: "Cloudflare demo (view only)",
    CLIENT_ID: "8f3c1e7a5b9d2046c7e1a3f5b8d0926e4c6a1f3e5d7b9a0c2e4f6a8b1d3c5e7f",
    CERT_ID: "Kq3xYd0wT9bL2hVnZ7mRc4pA8sJf5uGeW1oXi6tB_yE",
    KEY_LINE: '"-----BEGIN PRIVATE KEY-----\\nMIGHAgEAMBMG…(made up)…\\n-----END PRIVATE KEY-----"',
  });
  D.ZIP = `${D.REPO}-main.zip`;
  D.FOLDER = `${D.REPO}-main`;
  D.DIR = `C:\\dev\\${D.FOLDER}`;
  D.GH_URL = `github.com/${D.OWNER}/${D.REPO}`;
  WT.PROMPT = `${D.DIR}>`;

  // ---------------------------------------------------------------- GitHub
  const ghFiles = [
    ["folder", "app", "Customers and Status pages"],
    ["folder", "docs", "Security and key rotation guide"],
    ["folder", "public", "Walkthrough"],
    ["folder", "workers", "Zero Trust check"],
    ["file", ".dev.vars.example", "NetSuite settings"],
    ["file", ".gitignore", "Ignore keys and certificates"],
    ["file", "CLAUDE.md", "Project rules"],
    ["file", "README.md", "Setup steps"],
    ["file", "package.json", "Dependencies"],
    ["file", "wrangler.jsonc", "KV namespace for tokens"],
  ];
  S.github = () => `
    <div class="gh">
      <div class="gh-top"><span class="gh-mark"></span><span class="gh-path">${D.OWNER} <i>/</i> <b>${D.REPO}</b></span><span class="gh-search">Type / to search</span><span class="gh-sign">Sign in</span><span class="gh-sign solid">Sign up</span></div>
      <div class="gh-nav"><span class="on">&lt;&gt; Code</span><span>Issues</span><span>Pull requests</span><span>Actions</span><span>Security</span><span>Insights</span></div>
      <div class="gh-body">
        <div class="gh-main">
          <div class="gh-h"><b>${D.REPO}</b><span class="gh-pub">Public</span></div>
          <div class="gh-bar"><span class="gh-btn">main &#9662;</span><span class="gh-meta">1 Branch &middot; 0 Tags</span><span class="gh-sp"></span><span class="gh-btn">Go to file</span><span class="gh-btn green" id="ghCode">&lt;&gt; Code &#9662;</span></div>
          <div class="gh-files">
            <div class="gh-commit"><b>${D.OWNER}</b> Add the walkthrough <span>2 days ago &middot; 12 Commits</span></div>
            ${ghFiles.map(([icon, name, msg]) => `<div class="gh-row"><span><i class="ic-${icon}"></i>${name}</span><span>${msg}</span><span>2 days ago</span></div>`).join("")}
          </div>
          <div class="gh-readme"><h3>README</h3><h2>Cloudflare + NetSuite demo</h2><p>An example of how Cloudflare can be used to integrate with NetSuite's REST API, built to share with the Perth NetSuite User Group.</p></div>
          <div class="gh-menu" id="ghMenu" hidden>
            <div class="gh-mtabs"><b>Local</b><span>Codespaces</span></div>
            <p class="gh-mh">Clone</p>
            <div class="gh-murl">https://${D.GH_URL}.git</div>
            <p class="gh-mi">Open with GitHub Desktop</p>
            <p class="gh-mi" id="ghZip"><i class="ic-zip"></i>Download ZIP</p>
          </div>
        </div>
        <div class="gh-side"><h4>About</h4><p>Example for the Perth NetSuite User Group: integrating with NetSuite's REST API from Cloudflare Workers.</p><p class="gh-meta">Readme &middot; Activity &middot; 0 stars</p><h4>Languages</h4><div class="gh-lang"><i></i><i></i><i></i></div><p class="gh-meta">TypeScript &middot; JavaScript &middot; CSS</p></div>
      </div>
    </div>`;

  S.download = (icon, name, sub) =>
    `<h5>Downloads</h5><div class="dl-row"><i class="ic-${icon}"></i><div><b>${name}</b><small id="dlOpen">${sub}</small></div></div>`;

  // ---------------------------------------------------------------- nodejs.org
  const nodeTop = '<div class="nj-top"><b class="nj-logo">node<i>js</i></b><span>Learn</span><span>About</span><span id="njNavDl">Download</span><span>Blog</span><span>Docs</span><span>Certification</span></div>';
  S.nodeHome = () => `
    <div class="nj">${nodeTop}
      <div class="nj-hero"><h1>Run JavaScript Everywhere</h1>
        <p>Node.js&reg; is a free, open-source, cross-platform JavaScript runtime environment that lets developers create servers, web apps, command line tools and scripts.</p>
        <span class="nj-btn" id="njGet">Get Node.js&reg;</span>
        <small>Latest LTS: ${D.NODE}</small>
      </div>
    </div>`;
  S.nodeDownload = () => `
    <div class="nj">${nodeTop}
      <div class="nj-dl"><h1>Download Node.js&reg;</h1>
        <p class="nj-pick">Get Node.js&reg; <b>${D.NODE} (LTS)</b> for <b>Windows</b> using <b>Docker</b> with <b>npm</b></p>
        <pre># Or download a ready-made installer below</pre>
        <p class="nj-pick">Or get a prebuilt Node.js&reg; for <b>Windows</b> running a <b>x64</b> architecture.</p>
        <div class="nj-btns"><span class="nj-btn" id="njMsi">Windows Installer (.msi)</span><span class="nj-btn ghost">Standalone Binary (.zip)</span></div>
        <small>Read the changelog or blog post for this version. Learn how to verify signed downloads.</small>
      </div>
    </div>`;

  // ---------------------------------------------------------------- Cloudflare docs
  S.cfDocs = () => `
    <div class="cf">
      <div class="cf-top"><b class="cf-logo"><i></i>Cloudflare <span>Docs</span></b><span class="cf-search">Search</span><span>Log in</span></div>
      <div class="cf-body">
        <div class="cf-side"><p class="h">Workers</p><p>Overview</p><p>Get started</p><p class="h">Wrangler</p><p class="on">Install/Update Wrangler</p><p>Commands</p><p>Configuration</p><p>Environments</p><p>System environment variables</p></div>
        <div class="cf-main">
          <p class="cf-crumb">Workers &rsaquo; Wrangler</p>
          <h1>Install/Update Wrangler</h1>
          <p>Wrangler is a command-line tool for building with Cloudflare developer products.</p>
          <h2>Install Wrangler</h2>
          <p id="cfLocal">To keep versions consistent, <b>install Wrangler locally into each of your projects</b>, rather than globally on your computer. Everyone working on the project then uses the same version.</p>
          <pre id="cfCmd">npm i -D wrangler@latest</pre>
          <h2>Check your Wrangler version</h2>
          <pre>npx wrangler --version</pre>
        </div>
      </div>
    </div>`;

  // ---------------------------------------------------------------- the app
  const appMenu = [
    ["docs", "Documentation"],
    ["cert", "NetSuite certificate"],
    ["customers", "Customers"],
    ["status", "Status"],
  ];
  const app = (page, body) => `
    <div class="ap">
      <div class="ap-top"><b>Cloudflare + NetSuite demo</b>${appMenu.map(([id, label]) => `<span id="apNav-${id}" class="${id === page ? "on" : ""}">${label}</span>`).join("")}<em>Local dev &middot; Zero Trust check skipped</em></div>
      <div class="ap-main">${body}</div>
    </div>`;
  const icon = (tone) => `<i class="st ${tone}"></i>`;

  S.appHome = () =>
    app(
      "home",
      `<h1>Cloudflare + NetSuite demo</h1>
       <p class="lead">An example for the Perth NetSuite User Group of how Cloudflare can be used to integrate with NetSuite's REST API. It runs on Cloudflare Workers, signs in to NetSuite with a certificate instead of a password, and is only reachable by users signed in through Cloudflare Zero Trust.</p>
       <p>New here? <a>Watch the walkthrough</a>: every step from downloading the code to seeing your customers, shown on screen.</p>
       <div class="ap-cards">
         <div><h2>Documentation</h2><p>How it works and how to set it up, step by step, on the Cloudflare side and in NetSuite.</p></div>
         <div><h2>NetSuite certificate</h2><p>Make the certificate NetSuite needs and the private key the app signs with, in your browser.</p></div>
         <div><h2>Customers</h2><p>A list of customers read live from NetSuite's REST API, a page at a time.</p></div>
         <div><h2>Status</h2><p>Whether the settings are in place, a token can be issued and NetSuite answers.</p></div>
       </div>`,
    );

  const check = (n, label, tone, word, text, extra = "") =>
    `<div class="ap-check" id="apCheck${n}">${icon(tone)}<div><h2>${n}. ${label} <small>${word}</small></h2><p class="${tone === "skip" ? "mut" : ""}">${text}</p>${extra}</div></div>`;
  const settingsTable = (ok) =>
    `<table class="ap-set"><tr><th>Setting</th><th>State</th></tr>${["NETSUITE_ACCOUNT_ID", "NETSUITE_CLIENT_ID", "NETSUITE_CERTIFICATE_ID", "NETSUITE_PRIVATE_KEY"]
      .map((name, i) => `<tr><td><code>${name}</code></td><td>${icon(ok ? "ok" : "fail")}${ok ? (i === 3 ? "Valid EC P-256 key; sign with ES256" : "Set") : "Not set"}</td></tr>`)
      .join("")}</table>`;

  S.appStatus = (ready) =>
    app(
      "status",
      `<h1>Status</h1>
       <p class="lead">Whether this app is set up and can reach NetSuite. The checks run in the order a request depends on them, and each one says what to fix if it fails. Setting values and tokens are never shown.</p>
       <div class="ap-call ${ready ? "ok" : "info"}" id="apBanner">${icon(ready ? "ok" : "info")}<div><b>${ready ? "Connected to NetSuite" : "Not set up yet"}</b><p>${ready ? "Every check passed. <a>See the customers</a>." : "Some settings are missing. That is expected on a fresh copy: follow the steps under Settings below."}</p></div></div>
       <div class="ap-dl"><div><small>Running on</small><b>Local dev server (settings from .dev.vars)</b></div><div><small>NetSuite account</small><b id="apAcct">${ready ? "Sandbox account" : "Not set"}</b></div></div>
       <div class="ap-btns"><span class="ap-btn pri" id="apRun">Run checks again</span><span class="ap-btn${ready ? "" : " off"}">Request a new token</span></div>
       ${
         ready
           ? check(1, "Settings", "ok", "OK", "All four settings are set and the private key is valid.", settingsTable(true)) +
             check(2, "Token store (Workers KV)", "ok", "OK", "KV is available and holds a token that expires in about 60 minutes.") +
             check(3, "Access token", "ok", "OK", "NetSuite issued a new token and it was stored in KV. It expires in about 60 minutes.") +
             check(4, "Reading customers", "ok", "OK", "NetSuite answered in 412 ms. The role can read customers: 53 active.")
           : check(1, "Settings", "fail", "Problem", "4 of 4 settings need attention.", settingsTable(false)) +
             check(2, "Token store (Workers KV)", "ok", "OK", "KV is available. No token is stored yet.") +
             check(3, "Access token", "skip", "Skipped", "Needs the settings first.") +
             check(4, "Reading customers", "skip", "Skipped", "Needs an access token first.")
       }`,
    );

  S.appCert = (done) =>
    app(
      "cert",
      `<h1>NetSuite certificate generator</h1>
       <p class="lead">Makes the certificate NetSuite needs for OAuth 2.0 client credentials (M2M) and the private key this app signs with.</p>
       <div class="ap-call warn" id="apKeyNote">${icon("warn")}<div><b>The private key is made in your browser and never leaves it.</b><p>It is not sent to this app's server, Cloudflare or NetSuite, and it is gone when you reload the page.</p></div></div>
       <h2 class="num"><i>1</i>Generate</h2>
       <div class="ap-form">
         <label>Common name *<div class="fld" id="apCn">cloudflare-netsuite-demo</div></label>
         <label>Organisation<div class="fld"></div></label>
         <label>Country<div class="fld"></div></label>
         <label>Days valid *<div class="fld" id="apDays">365</div></label>
       </div>
       <span class="ap-btn pri" id="apGen">Generate</span>
       ${
         done
           ? `<p class="mut sm" id="apValid">Valid from 21 Nov 2026 to 21 Nov 2027 &middot; SHA-256 fingerprint 3A:9C:41:E7:…:5D:02</p>
       <div class="ap-pems">
         <div><h3>public.pem <small>certificate, upload to NetSuite</small></h3><pre>-----BEGIN CERTIFICATE-----\nMIIBkTCCATegAwIBAgIUQ2…(made up)…\n-----END CERTIFICATE-----</pre><span class="ap-btn" id="apDlPub">Download</span><span class="ap-btn">Copy</span></div>
         <div><h3>private.pem <small>private key, keep secret</small></h3><pre>-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMG…(made up)…\n-----END PRIVATE KEY-----</pre><span class="ap-btn">Download</span><span class="ap-btn">Copy</span></div>
       </div>
       <h2 class="num"><i>3</i>Store the private key</h2>
       <p>On your computer (local dev server): add this line to <code>.dev.vars</code>.</p>
       <div class="ap-code" id="apLine"><code>NETSUITE_PRIVATE_KEY=${esc(D.KEY_LINE)}</code><span class="ap-btn" id="apCopyLine">Copy</span></div>`
           : ""
       }`,
    );

  // Sample customers: invented names, example.com addresses, fictional phone range.
  const places = ["Karri", "Jarrah", "Banksia", "Marri", "Tuart", "Wandoo", "Peppermint", "Sheoak", "Kwongan", "Boab", "Mallee"];
  const trades = ["Engineering", "Logistics", "Dental", "Bakery", "Marine", "Electrical", "Surveying", "Hardware", "Nursery", "Freight", "Print", "Catering", "Plumbing"];
  const people = ["Jordan Avery", "Sam Whitlock", "Priya Raman", "Chris Okafor", "Mei Tanaka", "Dana Kowalski"];
  const customers = Array.from({ length: 53 }, (_, i) => {
    const person = i % 9 === 4;
    const name = person ? people[(i / 9) | 0] : `${places[(i * 3) % places.length]} ${trades[(i * 5) % trades.length]} Pty Ltd`;
    const slug = name.toLowerCase().replace(/ pty ltd$/, "").replace(/[^a-z]+/g, "");
    return { name, id: `CUS${String(1001 + i)} ${name}`, email: i % 6 === 2 ? "" : `${person ? "hello" : "accounts"}@${slug}.example.com`, phone: i % 7 === 3 ? "" : `08 5550 ${String(1100 + i * 37).slice(-4)}` };
  }).sort((a, b) => a.id.localeCompare(b.id));
  const none = '<span class="mut">&ndash;</span>';

  S.appCustomers = (page) => {
    const rows = customers.slice((page - 1) * 20, page * 20);
    const pager = `<div class="ap-pager"><span class="ap-btn${page === 1 ? " off" : ""}">Previous</span><span>Page ${page} of 3</span><span class="ap-btn${page === 3 ? " off" : ""}" id="apNext">Next</span></div>`;
    return app(
      "customers",
      `<h1>Customers</h1>
       <p class="lead">Active customers, read live from NetSuite's REST API each time this page loads, 20 at a time. The app signs in with its certificate, not as you, and can only see what its NetSuite role allows.</p>
       <div class="ap-row"><p id="apShowing">Showing <b>${(page - 1) * 20 + 1}</b> to <b>${(page - 1) * 20 + rows.length}</b> of <b>53</b> customers</p>${pager}</div>
       <table class="ap-table" id="apTable"><tr><th>Name</th><th>Customer ID</th><th>Email</th><th>Phone</th></tr>
         ${rows.map((c) => `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.id)}</td><td>${c.email ? `<a>${c.email}</a>` : none}</td><td>${c.phone || none}</td></tr>`).join("")}
       </table>
       <p class="mut sm" id="apFoot">NetSuite answered in ${page === 1 ? 388 : 301} ms. Used the access token kept in Workers KV.</p>`,
    );
  };

  // ---------------------------------------------------------------- NetSuite
  const nsCard = (inner) => `<div class="nl"><div class="nl-card"><b class="ns-logo">ORACLE <i>NETSUITE</i></b>${inner}</div><p class="nl-foot">Simulated sign-in page. Never type a real password into a page you did not open yourself.</p></div>`;
  S.nsLogin = () =>
    nsCard(`<h1>Log In</h1><label>Email address<div class="fld" id="nsEmail"></div></label><label>Password<div class="fld" id="nsPass"></div></label><span class="ns-btn pri wide" id="nsLoginBtn">Log In</span>`);
  S.ns2fa = () =>
    nsCard(`<h1>Two-Factor Authentication</h1><p>Enter the verification code from your authenticator app.</p><label>Verification code<div class="fld" id="ns2fa"></div></label><span class="ns-btn pri wide" id="ns2faBtn">Submit</span>`);
  S.nsRoles = () =>
    nsCard(`<h1>Choose Role</h1><p>${D.EMAIL} has access to these accounts.</p>
      <table class="nl-roles"><tr><th>Account</th><th>Role</th><th>Type</th></tr>
        <tr id="nsRoleProd"><td>${D.COMPANY}</td><td>Administrator</td><td><span class="ns-pill prod">PRODUCTION</span></td></tr>
        <tr id="nsRoleSb"><td>${D.COMPANY}</td><td>Administrator</td><td><span class="ns-pill">SANDBOX 1</span></td></tr>
      </table>`);

  const nsNav = ["Activities", "Payments", "Transactions", "Lists", "Reports", "Analytics", "Documents", "Setup", "Customization", "Support"];
  const ns = (title, body, buttons = "") => `
    <div class="ns">
      <div class="ns-top"><b class="ns-logo">ORACLE <i>NETSUITE</i></b><span class="ns-pill">SANDBOX 1</span><span class="ns-search">Search</span><span class="ns-user"><b>${D.USER}</b><small>${D.COMPANY} &ndash; Administrator</small></span></div>
      <div class="ns-nav"><span class="ns-home"></span>${nsNav.map((n) => `<span id="nsNav-${n}">${n}</span>`).join("")}</div>
      <div class="ns-menu" id="nsMenu" hidden></div>
      <div class="ns-head"><h1>${title}</h1>${buttons ? `<div class="ns-acts">${buttons}</div>` : ""}</div>
      <div class="ns-body">${body}</div>
    </div>`;
  const save = '<span class="ns-btn pri" id="nsSave">Save</span><span class="ns-btn">Cancel</span>';
  const f = (label, id, value = "", cls = "") => `<label class="ns-f ${cls}"><span>${label}</span><div class="fld" id="${id}">${value}</div></label>`;
  const cb = (label, id, on = false) => `<p class="ns-cb${on ? " on" : ""}" id="${id}"><i></i>${label}</p>`;
  const tabs = (names, on) => `<div class="ns-tabs">${names.map((n, i) => `<span class="${n === on ? "on" : ""}" id="nsTab${i}">${n}</span>`).join("")}</div>`;

  /** The cascading Setup menu, with `path` (below Setup) revealed so far. */
  const setupMenu = {
    Company: { "Company Information": 0, "Enable Features": 0, Subsidiaries: 0, Locations: 0, "Classes": 0 },
    Accounting: {},
    Sales: {},
    "Users/Roles": { "Manage Users": 0, "Manage Roles": ["New", "Search"], "User Management": ["View Login Audit Trail", "Two-Factor Authentication Roles"] },
    "Import/Export": {},
    Integration: {
      "Manage Integrations": ["New"],
      "Integration Management": ["Integration Governance"],
      "Manage Authentication": ["OAuth 2.0 Client Credentials (M2M) Setup", "OAuth 2.0 Authorized Applications"],
      "SOAP Web Services Preferences": 0,
    },
    Customization: {},
  };
  S.nsMenu = (path) => {
    const col = (names, picked, level) =>
      `<div>${names.map((n) => `<p data-m="${level}-${esc(n)}" class="${n === picked ? "on" : ""}">${esc(n)}${level < 2 && (level === 0 || Array.isArray(setupMenu[path[0]]?.[n])) ? "<u>&rsaquo;</u>" : ""}</p>`).join("")}</div>`;
    let html = col(Object.keys(setupMenu), path[0], 0);
    if (path[0]) html += col(Object.keys(setupMenu[path[0]]), path[1], 1);
    const third = path[1] && setupMenu[path[0]][path[1]];
    if (Array.isArray(third)) html += col(third, path[2], 2);
    return html;
  };

  S.nsHome = () =>
    ns(
      "Home",
      `<div class="ns-dash"><div><h3>Reminders</h3><p>3 Sales Orders to Approve</p><p>5 Bills to Pay</p><p>1 Customer Overdue</p></div><div><h3>Key Performance Indicators</h3><p>Sales <b>&#9650; 4.2%</b></p><p>Receivables <b>&#9660; 1.1%</b></p></div><div><h3>Recent Records</h3><p>Sales Order SO-1042</p><p>Customer CUS1007</p></div></div>`,
    );

  S.nsFeatures = () =>
    ns(
      "Enable Features",
      `${tabs(["Company", "Accounting", "Tax", "Transactions", "Items & Inventory", "Employees", "CRM", "Analytics", "Web Presence", "SuiteCloud"], "Company")}
       <div id="nsFeatCompany" class="ns-sec"><h3>Classifications</h3>${cb("Departments", "x1", true)}${cb("Locations", "x2", true)}${cb("Classes", "x3")}</div>
       <div id="nsFeatSc" hidden>
         <div class="ns-sec"><h3>SuiteScript</h3>${cb("Client SuiteScript", "x4", true)}${cb("Server SuiteScript", "x5", true)}</div>
         <div class="ns-sec"><h3>SuiteTalk (Web Services)</h3>${cb("SOAP Web Services", "x6")}${cb("REST Web Services", "nsRest")}</div>
         <div class="ns-sec"><h3>Manage Authentication</h3>${cb("Token-Based Authentication", "x7")}${cb("OAuth 2.0", "nsOauth")}</div>
       </div>
       <div id="nsFeatAn" hidden><div class="ns-sec"><h3>SuiteAnalytics</h3>${cb("SuiteAnalytics Workbook", "nsWorkbook")}${cb("SuiteAnalytics Connect", "x8")}</div></div>`,
      save,
    );

  S.nsCompany = () =>
    ns(
      "Company Information",
      `<div class="ns-grid">
         <div>${f("Company Name <em>*</em>", "c1", D.COMPANY)}${f("Legal Name", "c2", `${D.COMPANY} Pty Ltd`)}${f("Web Site", "c3", "www.example.com")}${f("Country <em>*</em>", "c4", "Australia", "sel")}</div>
         <div>${f("Time Zone", "c5", "(GMT+08:00) Perth", "sel")}${f("Currency", "c6", "Australian Dollar", "sel")}<label class="ns-f"><span>Account ID</span><div class="ns-ro" id="nsAcct">${D.ACCOUNT}</div></label><label class="ns-f"><span>Data Center URLs</span><div class="ns-ro">see Company URLs subtab</div></label></div>
       </div>`,
      save,
    );

  S.nsIntegration = () =>
    ns(
      "Integration",
      `<div class="ns-grid">
         <div>${f("Name <em>*</em>", "nsIName")}${f("Description", "nsIDesc", "", "tall")}</div>
         <div>${f("State <em>*</em>", "i2", "Enabled", "sel")}${f("Concurrency Limit", "nsIConc")}<label class="ns-f"><span>Max Concurrency Limit</span><div class="ns-ro">4</div></label></div>
       </div>
       ${tabs(["Authentication", "Execution Log"], "Authentication")}
       <div class="ns-grid three">
         <div class="ns-sec"><h3>Token-based Authentication</h3>${cb("Token-Based Authentication", "nsTba", true)}${cb("TBA: Authorization Flow", "x9")}</div>
         <div class="ns-sec"><h3>OAuth 2.0</h3>${cb("Authorization Code Grant", "nsAcg", true)}${cb("Client Credentials (Machine to Machine) Grant", "nsM2m")}${cb("Public Client", "x10")}</div>
         <div class="ns-sec"><h3>Scope</h3>${cb("RESTlets", "x11")}${cb("REST Web Services", "nsScope")}${cb("SuiteAnalytics Connect", "x12")}</div>
       </div>`,
      save,
    );

  S.nsIntegrationSaved = () =>
    ns(
      "Integration",
      `<div class="ns-ok">Confirmation: Integration successfully saved.</div>
       <div class="ns-grid"><div><label class="ns-f"><span>Name</span><div class="ns-ro">${D.INTEGRATION}</div></label><label class="ns-f"><span>State</span><div class="ns-ro">Enabled</div></label></div><div><label class="ns-f"><span>Concurrency Limit</span><div class="ns-ro">1</div></label></div></div>
       <div class="ns-cred" id="nsCred"><h3>Client Credentials</h3>
         <p class="ns-warn">Warning: for security reasons, this is the only time that the Client ID and Client Secret values are displayed. After you leave this page, they cannot be retrieved from the system.</p>
         <label class="ns-f"><span>Consumer Key / Client ID</span><div class="ns-ro mono" id="nsClientId">${D.CLIENT_ID}</div></label>
         <label class="ns-f"><span>Consumer Secret / Client Secret</span><div class="ns-ro mono" id="nsClientSecret">a41d&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull; (not needed)</div></label>
       </div>`,
      '<span class="ns-btn pri">Edit</span><span class="ns-btn">Back</span>',
    );

  const perms = [
    ["Lists", "Customers", "View"],
    ["Reports", "SuiteAnalytics Workbook", "Edit"],
    ["Setup", "Log in using OAuth 2.0 Access Tokens", "Full"],
    ["Setup", "REST Web Services", "Full"],
  ];
  S.nsRole = () =>
    ns(
      "Role",
      `<div class="ns-grid"><div>${f("Name <em>*</em>", "nsRName")}${f("ID", "r2", "")}</div><div>${f("Center Type", "r3", "Classic Center", "sel")}${cb("Web Services Only Role", "x13")}</div></div>
       ${tabs(["Permissions", "Restrictions", "Forms", "Searches", "Preferences"], "Permissions")}
       <div class="ns-tabs sub"><span>Transactions</span><span>Reports</span><span class="on">Lists</span><span>Setup</span><span>Custom Record</span></div>
       <table class="ns-table" id="nsPerms"><tr><th>Subtab</th><th>Permission</th><th>Level</th></tr>
         ${perms.map(([tab, name, level], i) => `<tr id="nsP${i}" hidden><td>${tab}</td><td>${name}</td><td><b>${level}</b></td></tr>`).join("")}
         <tr id="nsPAdd"><td colspan="3"><span class="ns-btn sm">Add</span> <span class="mut">Choose a permission and a level, then Add</span></td></tr>
       </table>`,
      save,
    );

  S.nsUsers = () =>
    ns(
      "Manage Users",
      `<table class="ns-table"><tr><th>Name</th><th>Email</th><th>Roles</th><th>Give Access</th></tr>
         <tr><td><a id="nsUserAlex">${D.USER}</a></td><td>${D.EMAIL}</td><td>Administrator</td><td>Yes</td></tr>
         <tr><td><a>Morgan Lee</a></td><td>morgan.lee@example.com</td><td>Accountant</td><td>Yes</td></tr>
         <tr><td><a>Riley Chen</a></td><td>riley.chen@example.com</td><td>Sales Manager</td><td>Yes</td></tr>
       </table>`,
    );

  S.nsEmployee = () =>
    ns(
      `Employee <small>${D.USER}</small>`,
      `<div class="ns-grid"><div><label class="ns-f"><span>Name</span><div class="ns-ro">${D.USER}</div></label><label class="ns-f"><span>Email</span><div class="ns-ro">${D.EMAIL}</div></label></div><div><label class="ns-f"><span>Subsidiary</span><div class="ns-ro">${D.COMPANY}</div></label></div></div>
       ${tabs(["Relationships", "Communication", "Address", "Human Resources", "Access", "System Information"], "Access")}
       ${cb("Give Access", "x14", true)}
       <div class="ns-tabs sub"><span class="on">Roles</span><span>Access History</span></div>
       <table class="ns-table" id="nsEmpRoles"><tr><th>Role</th></tr>
         <tr><td>Administrator</td></tr>
         <tr id="nsEmpNew" hidden><td>${D.ROLE}</td></tr>
         <tr><td><div class="fld sel inline" id="nsEmpRole"></div> <span class="ns-btn sm" id="nsEmpAdd">Add</span></td></tr>
       </table>`,
      save,
    );

  S.nsM2M = (mapped) =>
    ns(
      "OAuth 2.0 Client Credentials Setup",
      `<p class="mut">Each mapping ties one certificate to an entity, a role and an application.</p>
       <table class="ns-table" id="nsM2mTable"><tr><th>Entity</th><th>Role</th><th>Application</th><th>Certificate ID</th><th>Valid From</th><th>Valid Until</th><th>Algorithm</th><th>Revoked</th></tr>
         ${
           mapped
             ? `<tr id="nsM2mRow"><td>${D.USER}</td><td>${D.ROLE}</td><td>${D.INTEGRATION}</td><td class="mono" id="nsCertId">${D.CERT_ID}</td><td>21/11/2026</td><td>21/11/2027</td><td>EC</td><td><span class="ns-btn sm">Revoke</span></td></tr>`
             : '<tr><td colspan="8" class="mut">No records to show.</td></tr>'
         }
       </table>`,
      '<span class="ns-btn pri" id="nsM2mNew">Create New</span>',
    );

  S.nsM2MDialog = () => `
    <div class="dlg ns-dlg"><div class="dlg-t">Create a New Client Credentials Mapping</div>
      <div class="dlg-b">
        ${f("Entity <em>*</em>", "nsMEnt", "", "sel")}${f("Role <em>*</em>", "nsMRole", "", "sel")}${f("Application <em>*</em>", "nsMApp", "", "sel")}
        <label class="ns-f"><span>Certificate <em>*</em></span><div class="ns-file"><span class="ns-btn sm" id="nsMFile">Choose File</span><span id="nsMFileName">No file chosen</span></div></label>
      </div>
      <div class="dlg-f"><span class="ns-btn pri" id="nsMSave">Save</span><span class="ns-btn">Cancel</span></div>
    </div>`;
})();
