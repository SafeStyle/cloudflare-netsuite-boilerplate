/*
 * The walkthrough's script: one entry per step, in order.
 *
 *   chapter  groups steps in the timeline
 *   title    the step's heading
 *   what     what is happening (HTML)
 *   why      why it is done this way (HTML, optional)
 *   notes    extra callouts beside the screen: { kind: "warn" | "tip", text }
 *   run(s)   draws the screen from scratch, then animates it. `s` is the helper
 *            object from engine.js (s.go, s.click, s.type, s.note, s.cmd, ...).
 *
 * Every run() must set up everything it needs, because any step can be jumped to.
 * The steps follow README.md and the guides in docs/guides/: when those change,
 * change the matching step. See docs/walkthrough.md.
 */
"use strict";
(function () {
  const { screens: S, data: D, esc } = window.WT;
  const step = (o) => window.WT.steps.push(o);
  const P = esc(window.WT.PROMPT);

  // --- reusable screen states ---------------------------------------------------
  const TAB = {
    gh: `${D.OWNER}/${D.REPO}`,
    node: "Node.js — Run JavaScript Everywhere",
    cf: "Install/Update Wrangler · Cloudflare Docs",
    app: "Cloudflare + NetSuite demo",
  };
  const blank = '<div style="height:644px;background:#fff"></div>';
  const gh = () => ({ url: D.GH_URL, tabs: [TAB.gh], html: S.github() });
  const nodeDl = () => ({ url: "nodejs.org/en/download", tabs: [TAB.node], html: S.nodeDownload() });
  /** A page of the app. Once NetSuite is open in a second tab, pass withNs. */
  const app = (path, html, withNs = false) => ({
    url: `localhost:5173${path}`,
    tabs: withNs ? [TAB.app, "NetSuite"] : [TAB.app],
    active: 0,
    html,
    secure: false,
  });
  const ns = (path, title, html) => ({ url: D.NS_HOST + path, tabs: [TAB.app, `${title} - NetSuite (${D.COMPANY})`], html });

  const banner = ["Microsoft Windows [Version 10.0.26200.7171]", "(c) Microsoft Corporation. All rights reserved.", ""];
  const T = {
    versions: [`${P}node --version`, D.NODE, "", `${P}npm --version`, D.NPM, ""],
    install: [`${P}npm install`, "", "added 412 packages, and audited 413 packages in 38s", "", 'found <span class="g">0</span> vulnerabilities', "", `${P}npx wrangler --version`, "4.165.0", ""],
    copy: [`${P}copy .dev.vars.example .dev.vars`, "        1 file(s) copied.", ""],
    dev: [
      "",
      "> dev",
      "> react-router dev",
      "",
      '  <span class="g">&#x279C;</span>  <span class="w">Local:</span>   <span class="c" id="tUrl">http://localhost:5173/</span>',
      '  <span class="g">&#x279C;</span>  <span class="d">press</span> <span class="w">h + enter</span> <span class="d">to show help</span>',
    ],
  };
  const running = () => [...banner, ...T.versions, ...T.install, ...T.copy, `${P}npm run dev`, ...T.dev];

  const dir = (name) => ({ icon: "folder", name, type: "File folder" });
  const file = (name, type, size = "1 KB") => ({ icon: "file", name, type, size });
  const project = (installed) => [
    dir("app"),
    dir("docs"),
    ...(installed ? [dir("node_modules")] : []),
    dir("public"),
    dir("workers"),
    ...(installed ? [file(".dev.vars", "VARS File")] : []),
    file(".dev.vars.example", "EXAMPLE File"),
    file(".gitignore", "Git Ignore Source File"),
    file("CLAUDE.md", "Markdown Source File", "4 KB"),
    file("package.json", "JSON Source File"),
    file("package-lock.json", "JSON Source File", "186 KB"),
    file("README.md", "Markdown Source File", "6 KB"),
    file("wrangler.jsonc", "JSONC File", "2 KB"),
  ];
  const projectFolder = (installed) => ({
    tab: D.FOLDER,
    path: ["This PC", "Local Disk (C:)", "dev", D.FOLDER],
    items: project(installed),
  });
  const downloads = (extra = []) => ({
    tab: "Downloads",
    path: ["This PC", "Downloads"],
    items: [...extra, { icon: "zip", name: D.ZIP, type: "Compressed (zipped) Folder", size: "412 KB" }],
    extract: true,
  });

  /** .dev.vars as Notepad shows it, with the values filled in so far. */
  const vars = (have = {}) => {
    const v = (id, value) => `<span class="v" id="${id}">${value ? esc(value) : ""}</span>`;
    return [
      '<span class="cm"># Copy to .dev.vars for local dev (gitignored). Production: npx wrangler secret put &lt;NAME&gt;</span>',
      "",
      '<span class="cm"># Cloudflare Zero Trust (Access). Leave these empty locally: the dev server skips the</span>',
      '<span class="cm"># Zero Trust check. See docs/zero-trust.md.</span>',
      "ACCESS_TEAM_DOMAIN=",
      "ACCESS_AUD=",
      '<span class="cm"># The only people a deployed instance serves: full email addresses, comma-separated.</span>',
      "ACCESS_ALLOWED_EMAILS=",
      "",
      '<span class="cm"># NetSuite OAuth 2.0 client credentials (M2M). See docs/netsuite-credentials.md.</span>',
      `NETSUITE_ACCOUNT_ID=${v("vAcct", have.acct && D.ACCOUNT)}`,
      `NETSUITE_CLIENT_ID=${v("vClient", have.client && D.CLIENT_ID)}`,
      `NETSUITE_CERTIFICATE_ID=${v("vCert", have.cert && D.CERT_ID)}`,
      `NETSUITE_PRIVATE_KEY=${v("vKey", have.key && D.KEY_LINE)}`,
    ].join("\n");
  };
  const notepad = (have) => ({ title: ".dev.vars", html: vars(have), pos: "Ln 14, Col 1" });

  /** Opens NetSuite's Setup menu, walks down `path`, and loads `page`. */
  async function setup(s, path, page) {
    await s.click("#nsNav-Setup");
    s.on("#nsNav-Setup");
    const menu = s.$("#nsMenu");
    const shown = [];
    const draw = () => {
      menu.innerHTML = S.nsMenu(shown);
      menu.hidden = false;
      menu.style.left = `${Math.min(s.$("#nsNav-Setup").offsetLeft, 1240 - menu.offsetWidth)}px`;
    };
    draw();
    for (let i = 0; i < path.length; i++) {
      const item = `#nsMenu [data-m="${i}-${path[i]}"]`;
      if (i === path.length - 1) {
        await s.click(item);
      } else {
        await s.move(item);
        shown.push(path[i]);
        draw();
        await s.wait(240);
      }
    }
    await s.load(page);
  }
  const confirm = (s, text) => {
    s.$(".ns-body").insertAdjacentHTML("afterbegin", `<div class="ns-ok">Confirmation: ${text}</div>`);
  };
  const NS = {
    home: () => ns("/app/center/card.nl", "Home", S.nsHome()),
    features: () => ns("/app/setup/features.nl", "Enable Features", S.nsFeatures()),
    company: () => ns("/app/common/otherlists/company.nl", "Company Information", S.nsCompany()),
    integration: () => ns("/app/common/integration/integrapp.nl", "Integration", S.nsIntegration()),
    saved: () => ns("/app/common/integration/integrapp.nl?id=41", "Integration", S.nsIntegrationSaved()),
    role: () => ns("/app/setup/role.nl", "Role", S.nsRole()),
    users: () => ns("/app/setup/listusers.nl", "Manage Users", S.nsUsers()),
    employee: () => ns("/app/common/entity/employee.nl?id=7&e=T", "Employee", S.nsEmployee()),
    m2m: (mapped) => ns("/app/oauth2/clientcredentials/setup.nl", "OAuth 2.0 Client Credentials Setup", S.nsM2M(mapped)),
  };

  // =============================================================================
  step({
    chapter: "Start",
    title: "What you will end up with",
    what: "A small web app running on your own Windows PC that reads your customers live from NetSuite. This walkthrough shows every click and command to get there.",
    why: "You need a Windows PC, a NetSuite <b>sandbox</b> where you have the Administrator role, and about 30 minutes. You do not need a Cloudflare account, Git or any programming.",
    notes: [
      { kind: "warn", text: "Do this in a NetSuite sandbox, not production. The walkthrough stores a working key on your PC, which is only acceptable for a sandbox." },
      { kind: "tip", text: "The screens are drawn for this walkthrough. The real sites can look a little different, but the steps are the same." },
    ],
    async run(s) {
      s.open();
      s.browser(app("/customers", S.appCustomers(1)));
      await s.wait(500);
      s.note("#apShowing", "<b>Where you will end up:</b> your NetSuite customers, read live by an app running on your own PC.", "right");
    },
  });

  // ---------------------------------------------------------------- 1 Get the code
  step({
    chapter: "1 · Get the code",
    title: "Open the project on GitHub",
    what: "Open a browser and go to the project's page on GitHub.",
    why: "The project is public. You can read and download it without a GitHub account and without signing in.",
    async run(s) {
      s.open("browser");
      s.browser({ url: "", tabs: ["New tab"], html: blank });
      await s.wait(400);
      await s.go(D.GH_URL, gh());
      s.note(".gh-pub", "<b>Public:</b> no account or sign-in needed.", "right");
    },
  });

  step({
    chapter: "1 · Get the code",
    title: "Download it as a ZIP file",
    what: "Select the green <b>Code</b> button, then <b>Download ZIP</b>. The browser saves one file to your Downloads folder.",
    why: "A ZIP is the simplest way to get the files: there is nothing to install first. Developers usually use Git instead, which also keeps the history, but you do not need it to run the demo.",
    async run(s) {
      s.open("browser");
      s.browser(gh());
      await s.wait(500);
      await s.click("#ghCode");
      s.show("#ghMenu");
      await s.wait(400);
      s.note("#ghZip", "<b>Download ZIP:</b> every file in one go.", "left");
      await s.wait(1300);
      await s.click("#ghZip");
      s.hide("#ghMenu");
      s.clearNotes();
      await s.wait(600);
      s.fly(S.download("zip", D.ZIP, "Open file"));
      s.note("#bFly", "Saved to your <b>Downloads</b> folder.", "left");
    },
  });

  step({
    chapter: "1 · Get the code",
    title: "Extract the ZIP to C:\\dev",
    what: "Open File Explorer, go to <b>Downloads</b>, right-click the ZIP and choose <b>Extract All</b>. Change the destination to <code>C:\\dev</code>, then select <b>Extract</b>.",
    why: "Windows cannot run a project from inside a ZIP. Extracting to <code>C:\\dev</code> gives a short path that is easy to type, and keeps the project out of folders such as Desktop and Documents that OneDrive may copy to the cloud.",
    notes: [{ kind: "warn", text: "This folder will hold a file with secrets in it. Do not put it anywhere that is synced or shared: OneDrive, Dropbox, a network drive." }],
    async run(s) {
      s.open("browser", "explorer");
      s.browser(gh());
      await s.switchTo("explorer", () => s.explorer(downloads()));
      s.on("#xNavDl");
      await s.click("#xi0", 0.2);
      s.on("#xi0", "sel");
      s.overlay('<div class="ctx" style="left:420px;top:208px"><p>Open</p><p>Open in new window</p><hr><p id="ctxExtract">Extract All...</p><p>Pin to Start</p><p>Compress to...</p><hr><p>Properties</p></div>', false);
      await s.wait(500);
      await s.click("#ctxExtract");
      s.overlay(`<div class="dlg"><div class="dlg-t"><i class="ic-zip"></i>Extract Compressed (Zipped) Folders</div>
        <div class="dlg-b"><h4>Select a Destination and Extract Files</h4><p>Files will be extracted to this folder:</p>
        <div class="fld" id="exPath">C:\\Users\\Alex\\Downloads\\${D.FOLDER}</div>
        <p style="margin-top:14px">&#9745; Show extracted files when complete</p></div>
        <div class="dlg-f"><span class="btn pri" id="exGo">Extract</span><span class="btn">Cancel</span></div></div>`);
      await s.wait(500);
      s.note("#exPath", "Replace this with a short folder that is <b>not synced to the cloud</b>.", "bottom");
      await s.wait(1500);
      await s.click("#exPath");
      await s.type("#exPath", "C:\\dev");
      s.clearNotes();
      await s.click("#exGo");
      s.closeOverlay();
      s.explorer(projectFolder(false));
      s.off("#xNavDl");
      s.on("#xNavC");
      await s.wait(400);
      s.note("#xAddr", `The project is now in <code>${esc(D.DIR)}</code>`, "bottom");
    },
  });

  // ---------------------------------------------------------------- 2 Install the tools
  step({
    chapter: "2 · Install the tools",
    title: "Download Node.js",
    what: "Go to <b>nodejs.org</b>, select <b>Get Node.js</b>, then <b>Windows Installer (.msi)</b>.",
    why: "Node.js is what runs the app on your PC. It comes with <b>npm</b>, the tool that fetches the other software the project needs. Take the LTS (long-term support) version: the project needs 22.22 or newer.",
    notes: [{ kind: "tip", text: "Your version number will be newer than the one shown here. That is fine." }],
    async run(s) {
      s.open("browser", "explorer");
      s.browser(gh());
      await s.wait(300);
      await s.go("nodejs.org", { url: "nodejs.org/en", tabs: [TAB.node], html: S.nodeHome() });
      await s.click("#njGet");
      await s.load(nodeDl());
      s.note("#njMsi", "<b>Windows Installer (.msi):</b> an ordinary setup wizard.", "bottom");
      await s.wait(1500);
      await s.click("#njMsi");
      s.clearNotes();
      await s.wait(500);
      s.fly(S.download("msi", `node-${D.NODE}-x64.msi`, "Open file"));
    },
  });

  step({
    chapter: "2 · Install the tools",
    title: "Run the Node.js installer",
    what: "Open the downloaded file and go through the wizard: accept the licence, keep every default, select <b>Install</b>, and say <b>Yes</b> when Windows asks for permission.",
    why: "The defaults are right. In particular, leave <b>Tools for Native Modules</b> unticked: it installs a large set of build tools the demo does not use.",
    async run(s) {
      s.open("browser", "explorer");
      s.browser(nodeDl());
      s.fly(S.download("msi", `node-${D.NODE}-x64.msi`, "Open file"));
      await s.wait(400);
      await s.click("#dlOpen");
      s.fly(null);
      const wizard = (body, button, extra = "") =>
        s.overlay(`<div class="dlg"><div class="dlg-t"><i class="ic-msi"></i>Node.js Setup</div><div class="dlg-b">${body}</div><div class="dlg-f">${extra}<span class="btn pri" id="wzNext">${button}</span><span class="btn">Cancel</span></div></div>`);
      wizard("<h4>Welcome to the Node.js Setup Wizard</h4><p>The Setup Wizard will install Node.js on your computer.</p>", "Next");
      await s.wait(500);
      await s.click("#wzNext");
      wizard('<h4>End-User License Agreement</h4><p>Please read the following license agreement carefully.</p><p id="wzAccept">&#9744; I accept the terms in the License Agreement</p>', "Next", '<span class="btn">Back</span>');
      await s.click("#wzAccept", 0.03);
      s.set("#wzAccept", "&#9745; I accept the terms in the License Agreement");
      await s.click("#wzNext");
      wizard('<h4>Tools for Native Modules</h4><p>Optionally install the tools necessary to compile native modules.</p><p id="wzTools">&#9744; Automatically install the necessary tools.</p>', "Next", '<span class="btn">Back</span>');
      await s.wait(300);
      s.note("#wzTools", "<b>Leave this unticked.</b> The demo does not need it.", "bottom");
      await s.wait(1700);
      s.clearNotes();
      await s.click("#wzNext");
      wizard("<h4>Ready to install Node.js</h4><p>Click Install to begin the installation.</p>", "Install", '<span class="btn">Back</span>');
      await s.click("#wzNext");
      s.overlay('<div class="dlg uac"><div class="dlg-t">User Account Control</div><div class="dlg-b"><h4>Do you want to allow this app to make changes to your device?</h4><p><b>Node.js</b><br>Verified publisher: OpenJS Foundation</p></div><div class="dlg-f"><span class="btn pri" id="uacYes">Yes</span><span class="btn">No</span></div></div>');
      await s.wait(600);
      await s.click("#uacYes");
      wizard('<h4>Installing Node.js</h4><p>Please wait while the Setup Wizard installs Node.js.</p><div class="bar" id="wzBar"><i></i></div>', "Next");
      await s.wait(100);
      s.on("#wzBar", "go");
      await s.wait(2000);
      wizard("<h4>Completed the Node.js Setup Wizard</h4><p>Click the Finish button to exit the Setup Wizard.</p>", "Finish");
      await s.wait(500);
      await s.click("#wzNext");
      s.closeOverlay();
    },
  });

  step({
    chapter: "2 · Install the tools",
    title: "Wrangler: nothing to install yourself",
    what: "Wrangler is Cloudflare's command-line tool. It is what runs a Cloudflare Worker on your PC. Cloudflare's own instructions say to install it inside each project, and this project already lists it.",
    why: "So there is no separate download: the next step's <code>npm install</code> fetches Wrangler along with everything else. And you do not need a Cloudflare account to run the app on your own PC, only to put it on the internet later.",
    async run(s) {
      s.open("browser", "explorer");
      s.browser(nodeDl());
      await s.wait(300);
      await s.go("developers.cloudflare.com/workers/wrangler/install-and-update", {
        url: "developers.cloudflare.com/workers/wrangler/install-and-update/",
        tabs: [TAB.cf],
        html: S.cfDocs(),
      });
      s.note("#cfLocal", "Installed <b>inside each project</b>, not once for the whole PC.", "bottom");
      await s.wait(2600);
      s.clearNotes();
      s.note("#cfCmd", "<b>You do not need to run this.</b> The project already includes Wrangler; <code>npm install</code> fetches it in a moment.", "bottom");
    },
  });

  step({
    chapter: "2 · Install the tools",
    title: "Open Command Prompt in the project folder",
    what: "In File Explorer, open the project folder. Click the address bar, type <code>cmd</code> and press Enter. A Command Prompt opens, already in that folder. Then check Node.js and npm answer.",
    why: "Opening it <b>after</b> installing Node.js matters: a window that was already open does not know about newly installed programs.",
    notes: [{ kind: "tip", text: "Use Command Prompt rather than PowerShell. On a new PC, PowerShell refuses to run <code>npm</code> until you change a security setting; Command Prompt just works." }],
    async run(s) {
      s.open("browser", "explorer");
      s.browser({ url: "developers.cloudflare.com/workers/wrangler/install-and-update/", tabs: [TAB.cf], html: S.cfDocs() });
      await s.switchTo("explorer", () => s.explorer(projectFolder(false)));
      await s.click("#xAddr", 0.6);
      await s.type("#xAddr", "cmd", { delay: 120 });
      s.note("#xAddr", "Type <code>cmd</code> here and press <b>Enter</b>.", "bottom");
      await s.wait(1300);
      s.clearNotes();
      s.terminal([...banner, P]);
      await s.wait(700);
      await s.cmd("node --version");
      await s.out([D.NODE]);
      s.prompt();
      await s.cmd("npm --version");
      await s.out([`<span id="tNpm">${D.NPM}</span>`]);
      s.prompt();
      s.note("#tNpm", "Both answer with a version number, so Node.js is installed.", "right");
    },
  });

  step({
    chapter: "2 · Install the tools",
    title: "Install the project's software",
    what: "Type <code>npm install</code> and press Enter. npm reads the project's list of what it needs and downloads it all into a <code>node_modules</code> folder inside the project. It takes a minute or so.",
    why: "This is where Wrangler arrives, along with the web framework and everything else. Nothing is installed outside the project folder; delete the folder and it is all gone.",
    async run(s) {
      s.open("browser", "explorer", "terminal");
      s.terminal([...banner, ...T.versions, P]);
      await s.wait(500);
      await s.cmd("npm install");
      await s.wait(1600);
      await s.out(T.install.slice(1, 5), 260);
      s.prompt();
      await s.wait(500);
      await s.cmd("npx wrangler --version");
      await s.wait(500);
      await s.out(['<span id="tWr">4.165.0</span>']);
      s.prompt();
      s.note("#tWr", "<b>Wrangler is here</b> without a separate install.", "right");
    },
  });

  // ---------------------------------------------------------------- 3 Run it locally
  step({
    chapter: "3 · Run it locally",
    title: "Create your settings file",
    what: "Type <code>copy .dev.vars.example .dev.vars</code>. This makes your own copy of the example settings file, called <code>.dev.vars</code>.",
    why: "<code>.dev.vars</code> is where the app reads its secrets from when it runs on your PC. The example file only has the names. Your copy will get the real values later, and the project is set up so that file is never uploaded anywhere.",
    async run(s) {
      s.open("browser", "explorer", "terminal");
      s.terminal([...banner, ...T.versions, ...T.install, P]);
      await s.wait(500);
      await s.cmd("copy .dev.vars.example .dev.vars");
      await s.out(["        1 file(s) copied."]);
      s.prompt();
    },
  });

  step({
    chapter: "3 · Run it locally",
    title: "Start the app",
    what: "Type <code>npm run dev</code>. After a few seconds it prints the app's address: <code>http://localhost:5173/</code>.",
    why: "<b>localhost</b> means \"this computer\". The app is only reachable from your own PC, not from your network or the internet. It keeps running until you close this window or press Ctrl+C.",
    notes: [{ kind: "tip", text: "Leave this window open. Closing it stops the app." }],
    async run(s) {
      s.open("browser", "explorer", "terminal");
      s.terminal([...banner, ...T.versions, ...T.install, ...T.copy, P]);
      await s.wait(500);
      await s.cmd("npm run dev");
      await s.out(T.dev.slice(0, 4), 160);
      await s.wait(1100);
      await s.out(T.dev.slice(4), 160);
      s.note("#tUrl", "The app's address. It only works <b>on this PC</b>.", "bottom");
    },
  });

  step({
    chapter: "3 · Run it locally",
    title: "Open the app in your browser",
    what: "Go to <code>localhost:5173</code> in the browser. The app's home page appears.",
    why: "The note at the top right, \"Zero Trust check skipped\", is the one thing that differs on your own PC. Any copy of this app that is put on the internet refuses everyone who has not signed in through Cloudflare Zero Trust.",
    async run(s) {
      s.open("browser", "explorer", "terminal");
      s.terminal(running());
      await s.switchTo("browser", () => s.browser({ url: "", tabs: ["New tab"], html: blank }));
      await s.go("localhost:5173", app("/", S.appHome()));
      s.note(".ap-top em", "No sign-in on your own PC. A deployed copy is locked behind <b>Cloudflare Zero Trust</b>.", "bottom");
    },
  });

  step({
    chapter: "3 · Run it locally",
    title: "Check Status: not set up yet",
    what: "Select <b>Status</b> in the menu. It reports that four settings are missing, and skips the checks that depend on them.",
    why: "Nothing has been connected yet, so this is expected. The app does not crash or show an error page: it says exactly what is missing and what to do. You will come back here at the end to see it all pass.",
    async run(s) {
      s.open("browser", "explorer", "terminal");
      s.browser(app("/", S.appHome()));
      await s.wait(400);
      await s.click("#apNav-status");
      await s.load(app("/status", S.appStatus(false)));
      s.note("#apBanner", "Expected on a fresh copy.", "right");
      await s.wait(1800);
      s.clearNotes();
      await s.scroll("#apCheck1", 60);
      s.note("#apCheck1", "It shows <b>whether</b> each setting is present, never the value.", "right");
    },
  });

  // ---------------------------------------------------------------- 4 Make a certificate
  step({
    chapter: "4 · Make a certificate",
    title: "Generate a certificate and private key",
    what: "Open <b>NetSuite certificate</b>, keep the name and 365 days, and select <b>Generate</b>. Then download <b>public.pem</b>.",
    why: "The app does not sign in to NetSuite with a password. It holds a <b>private key</b>, and NetSuite holds the matching <b>certificate</b>. The certificate can check that a request came from the key, but cannot be used to make one, so it is safe to hand over.",
    notes: [
      { kind: "warn", text: "The private key is the secret. It is created inside your browser and never sent to any server, not even this app's." },
      { kind: "tip", text: "How long the certificate lasts is fixed here, when it is made. NetSuite allows at most two years; a shorter time limits how long a stolen key is useful." },
    ],
    async run(s) {
      s.open("browser", "explorer", "terminal");
      s.browser(app("/status", S.appStatus(false)));
      await s.wait(300);
      await s.click("#apNav-cert");
      await s.load(app("/netsuite-certificate", S.appCert(false)));
      s.note("#apKeyNote", "The key is made <b>in this browser tab</b>.", "right", "warn");
      await s.wait(2000);
      s.clearNotes();
      s.note("#apDays", "Valid for a year. <b>Set now, cannot be extended later.</b>", "bottom");
      await s.wait(2000);
      s.clearNotes();
      await s.click("#apGen");
      await s.wait(500);
      s.browser(app("/netsuite-certificate", S.appCert(true)));
      await s.scroll("#apValid", 200);
      s.note("#apDlPub", "<b>public.pem</b> is the part NetSuite gets.", "bottom");
      await s.wait(1600);
      await s.click("#apDlPub");
      s.clearNotes();
      s.fly(S.download("file", "public.pem", "Open file"));
    },
  });

  step({
    chapter: "4 · Make a certificate",
    title: "Put the private key in .dev.vars",
    what: "The page shows the private key as one line, ready to paste. Select <b>Copy</b>. In File Explorer, right-click <code>.dev.vars</code>, choose <b>Edit in Notepad</b>, and paste it after <code>NETSUITE_PRIVATE_KEY=</code>.",
    why: "A key is normally several lines long, but each setting in <code>.dev.vars</code> must fit on one line. The page has already converted it, with <code>\\n</code> marking where the line breaks go. Do it now: the key is gone from the page as soon as you reload.",
    notes: [{ kind: "warn", text: "You do not need to download private.pem at all. The fewer copies of the key, the better." }],
    async run(s) {
      s.open("browser", "explorer", "terminal");
      s.browser(app("/netsuite-certificate", S.appCert(true)));
      await s.scroll("#apLine", 260);
      s.note("#apLine", "The private key as <b>one line</b>.", "top");
      await s.wait(1300);
      await s.click("#apCopyLine");
      s.set("#apCopyLine", "Copied");
      await s.wait(700);
      s.clearNotes();
      const folder = projectFolder(true);
      const row = `#xi${folder.items.findIndex((it) => it.name === ".dev.vars")}`;
      await s.switchTo("explorer", () => s.explorer(folder));
      await s.click(row, 0.12);
      s.on(row, "sel");
      s.overlay('<div class="ctx" style="left:400px;top:330px"><p>Open with...</p><p id="ctxEdit">Edit in Notepad</p><hr><p>Copy as path</p><p>Properties</p></div>', false);
      await s.wait(400);
      await s.click("#ctxEdit");
      s.closeOverlay();
      s.notepad(notepad({}));
      await s.wait(600);
      await s.click("#vKey", 0, 0.5);
      s.on("#vKey", "focus");
      await s.wait(500);
      await s.paste("#vKey", D.KEY_LINE);
      s.note("#vKey", "Pasted with <b>Ctrl+V</b>. Keep the quotes.", "top");
    },
  });

  // ---------------------------------------------------------------- 5 Set up NetSuite
  step({
    chapter: "5 · Set up NetSuite",
    title: "Log in to your NetSuite sandbox as Administrator",
    what: "Open a new tab and log in to NetSuite: email, password, then the code from your authenticator app. When asked which account to use, pick the <b>sandbox</b> with the Administrator role.",
    why: "Only an administrator can create integrations and roles. A sandbox is a copy of your account for trying things: nothing you do there reaches your live data.",
    notes: [{ kind: "warn", text: "Check for the sandbox label at the top of every NetSuite page before you change anything." }],
    async run(s) {
      s.open("browser", "explorer", "terminal", "notepad");
      s.browser({ url: "", tabs: [TAB.app, "New tab"], html: blank });
      await s.wait(300);
      await s.go("system.netsuite.com", { url: "system.netsuite.com/pages/customerlogin.jsp", tabs: [TAB.app, "NetSuite - Login"], html: S.nsLogin() });
      await s.click("#nsEmail");
      await s.type("#nsEmail", D.EMAIL, { delay: 22 });
      await s.click("#nsPass");
      await s.type("#nsPass", "correct-horse", { mask: true });
      await s.click("#nsLoginBtn");
      await s.load({ url: "system.netsuite.com/app/login/secure/securityquestions.nl", html: S.ns2fa() });
      await s.click("#ns2fa");
      await s.type("#ns2fa", "418207", { delay: 90 });
      await s.click("#ns2faBtn");
      await s.load({ url: "system.netsuite.com/app/login/secure/changerole.nl", html: S.nsRoles() });
      s.note("#nsRoleSb", "<b>Choose the sandbox.</b> Never do this in production.", "right", "warn");
      await s.wait(2200);
      s.clearNotes();
      await s.click("#nsRoleSb");
      await s.load(NS.home());
      s.note(".ns-top .ns-pill", "You are in the sandbox.", "bottom");
    },
  });

  step({
    chapter: "5 · Set up NetSuite",
    title: "Turn on REST web services and OAuth 2.0",
    what: "Go to <b>Setup &gt; Company &gt; Enable Features</b>. On the <b>SuiteCloud</b> tab tick <b>REST Web Services</b> and <b>OAuth 2.0</b>. On the <b>Analytics</b> tab tick <b>SuiteAnalytics Workbook</b>. Select <b>Save</b>.",
    why: "These are switched off in many accounts. REST web services is the door the app comes in through, OAuth 2.0 is how it proves who it is, and SuiteAnalytics Workbook is what lets it run a query for the customer list.",
    notes: [{ kind: "tip", text: "If they are already ticked, there is nothing to do here. NetSuite may ask you to accept its terms of service the first time." }],
    async run(s) {
      s.open("browser", "explorer", "terminal", "notepad");
      s.browser(NS.home());
      await s.wait(300);
      await setup(s, ["Company", "Enable Features"], NS.features());
      await s.click("#nsTab9");
      s.off("#nsTab0");
      s.on("#nsTab9");
      s.hide("#nsFeatCompany");
      s.show("#nsFeatSc");
      await s.click("#nsRest", 0.02);
      s.on("#nsRest");
      s.note("#nsRest", "The door the app uses.", "right");
      await s.click("#nsOauth", 0.02);
      s.on("#nsOauth");
      await s.wait(900);
      s.clearNotes();
      await s.click("#nsTab7");
      s.off("#nsTab9");
      s.on("#nsTab7");
      s.hide("#nsFeatSc");
      s.show("#nsFeatAn");
      await s.click("#nsWorkbook", 0.02);
      s.on("#nsWorkbook");
      await s.wait(500);
      await s.click("#nsSave");
      confirm(s, "Features successfully saved.");
    },
  });

  step({
    chapter: "5 · Set up NetSuite",
    title: "Find your account ID",
    what: "Go to <b>Setup &gt; Company &gt; Company Information</b> and copy the <b>Account ID</b>. Paste it into <code>.dev.vars</code> after <code>NETSUITE_ACCOUNT_ID=</code>.",
    why: "The account ID is part of the web address the app calls. A sandbox's ID ends in <code>_SB1</code>, which is also how the app's Status page can tell you are not pointing at production.",
    async run(s) {
      s.open("browser", "explorer", "terminal", "notepad");
      s.browser(NS.features());
      await s.wait(300);
      await setup(s, ["Company", "Company Information"], NS.company());
      s.note("#nsAcct", "Your <b>account ID</b>. <code>_SB1</code> means sandbox 1.", "left");
      await s.wait(1900);
      await s.click("#nsAcct", 0.1);
      s.on("#nsAcct", "pasted");
      await s.wait(600);
      s.clearNotes();
      await s.switchTo("notepad", () => s.notepad(notepad({ key: true })));
      await s.click("#vAcct", 0, 0.5);
      await s.paste("#vAcct", D.ACCOUNT);
    },
  });

  step({
    chapter: "5 · Set up NetSuite",
    title: "Create the integration record",
    what: "Go to <b>Setup &gt; Integration &gt; Manage Integrations &gt; New</b>. Name it, set <b>Concurrency Limit</b> to <b>1</b>, untick the two boxes NetSuite ticks by default, then tick <b>Client Credentials (Machine to Machine) Grant</b> and the <b>REST Web Services</b> scope. Select <b>Save</b>.",
    why: "An integration record tells NetSuite that an outside application may connect, and how. \"Machine to machine\" means the app signs in by itself with its certificate: nobody types a password.",
    notes: [
      { kind: "tip", text: "<b>Concurrency</b> is how many requests can be in progress at once. Your whole account shares a small number. Giving the demo a limit of 1 means it can never use up the capacity your real integrations need." },
    ],
    async run(s) {
      s.open("browser", "explorer", "terminal", "notepad");
      s.browser(NS.company());
      await s.wait(300);
      await setup(s, ["Integration", "Manage Integrations", "New"], NS.integration());
      await s.click("#nsIName");
      await s.type("#nsIName", D.INTEGRATION);
      await s.click("#nsIConc");
      await s.type("#nsIConc", "1");
      s.note("#nsIConc", "<b>1 request at a time.</b> The demo cannot crowd out anything else.", "left");
      await s.wait(2300);
      s.clearNotes();
      await s.scroll("#nsTba", 330);
      await s.click("#nsTba", 0.03);
      s.off("#nsTba");
      await s.click("#nsAcg", 0.03);
      s.off("#nsAcg");
      await s.click("#nsM2m", 0.03);
      s.on("#nsM2m");
      s.note("#nsM2m", "<b>Machine to machine:</b> a certificate, not a person and a password.", "bottom");
      await s.wait(2000);
      s.clearNotes();
      await s.click("#nsScope", 0.03);
      s.on("#nsScope");
      await s.wait(500);
      await s.scroll(0);
      await s.click("#nsSave");
      await s.load(NS.saved());
    },
  });

  step({
    chapter: "5 · Set up NetSuite",
    title: "Copy the client ID: it is shown only once",
    what: "After saving, NetSuite shows a <b>Client ID</b> and a <b>Client Secret</b>. Copy the Client ID and paste it into <code>.dev.vars</code> after <code>NETSUITE_CLIENT_ID=</code>.",
    why: "The client ID is the integration's name as far as the app is concerned. NetSuite never shows it again after you leave this page; if you lose it you have to reset it. The client secret is not used: the certificate does that job.",
    async run(s) {
      s.open("browser", "explorer", "terminal", "notepad");
      s.browser(NS.saved());
      await s.wait(400);
      s.note("#nsCred", "<b>Shown once.</b> Copy the Client ID before leaving this page.", "top", "warn");
      await s.wait(2300);
      await s.click("#nsClientId", 0.3);
      s.on("#nsClientId", "pasted");
      await s.wait(700);
      s.clearNotes();
      await s.switchTo("notepad", () => s.notepad(notepad({ key: true, acct: true })));
      await s.click("#vClient", 0, 0.5);
      await s.paste("#vClient", D.CLIENT_ID);
    },
  });

  step({
    chapter: "5 · Set up NetSuite",
    title: "Create a view-only role",
    what: "Go to <b>Setup &gt; Users/Roles &gt; Manage Roles &gt; New</b>. Name the role and give it four permissions: <b>Customers</b> at View, <b>SuiteAnalytics Workbook</b>, <b>Log in using OAuth 2.0 Access Tokens</b> and <b>REST Web Services</b>. Select <b>Save</b>.",
    why: "The role decides what the app can do in NetSuite. This one can look at customers and nothing else: it cannot create, change or delete anything, and it cannot see invoices, employees or anything not listed.",
    notes: [{ kind: "warn", text: "Never give an integration the Administrator role. If its key leaked, the thief would get everything. With this role they would get a list of customers." }],
    async run(s) {
      s.open("browser", "explorer", "terminal", "notepad");
      s.browser(NS.saved());
      await s.wait(300);
      await setup(s, ["Users/Roles", "Manage Roles", "New"], NS.role());
      await s.click("#nsRName");
      await s.type("#nsRName", D.ROLE);
      await s.scroll("#nsPerms", 190);
      for (let i = 0; i < 4; i++) {
        await s.click("#nsPAdd .ns-btn");
        s.show(`#nsP${i}`);
        s.on(`#nsP${i}`, "new");
        await s.wait(350);
      }
      s.note("#nsPerms", "<b>Look, do not touch:</b> view customers, run a query, sign in. Nothing else.", "top");
      await s.wait(3000);
      s.clearNotes();
      await s.scroll(0);
      await s.click("#nsSave");
      confirm(s, "Role successfully saved.");
    },
  });

  step({
    chapter: "5 · Set up NetSuite",
    title: "Give yourself the new role",
    what: "Go to <b>Setup &gt; Users/Roles &gt; Manage Users</b>, open your own record, and on the <b>Access</b> tab add the new role. Select <b>Save</b>.",
    why: "A certificate is tied to a user <b>and</b> a role that user holds. Adding the view-only role to yourself lets you tie the certificate to \"you, acting only as view-only\", not to you as Administrator.",
    notes: [{ kind: "tip", text: "Using your own user is the quickest way to try the demo. For anything lasting, create a separate user just for the integration, so its activity is not mixed with yours in NetSuite's logs." }],
    async run(s) {
      s.open("browser", "explorer", "terminal", "notepad");
      s.browser(NS.role());
      await s.wait(300);
      await setup(s, ["Users/Roles", "Manage Users"], NS.users());
      await s.click("#nsUserAlex");
      await s.load(NS.employee());
      await s.click("#nsEmpRole");
      await s.paste("#nsEmpRole", D.ROLE);
      await s.click("#nsEmpAdd");
      s.show("#nsEmpNew");
      s.on("#nsEmpNew", "new");
      s.set("#nsEmpRole", "");
      s.note("#nsEmpNew", "You now hold this role as well as Administrator.", "right");
      await s.wait(2200);
      s.clearNotes();
      await s.click("#nsSave");
      confirm(s, "Employee successfully saved.");
    },
  });

  step({
    chapter: "5 · Set up NetSuite",
    title: "Upload the certificate and create the mapping",
    what: "Go to <b>Setup &gt; Integration &gt; Manage Authentication &gt; OAuth 2.0 Client Credentials (M2M) Setup</b> and select <b>Create New</b>. Choose yourself, the view-only role and the integration, pick <b>public.pem</b>, and <b>Save</b>.",
    why: "This is the step that ties it all together. NetSuite now knows: a request signed by the key that matches this certificate is this integration, acting as this user, with this role. Everything it does is recorded in NetSuite under that user.",
    notes: [{ kind: "tip", text: "One certificate fits exactly one combination of user, role and integration. To give several jobs different access, give each its own certificate and role." }],
    async run(s) {
      s.open("browser", "explorer", "terminal", "notepad");
      s.browser(NS.employee());
      await s.wait(300);
      await setup(s, ["Integration", "Manage Authentication", "OAuth 2.0 Client Credentials (M2M) Setup"], NS.m2m(false));
      await s.click("#nsM2mNew");
      s.overlay(S.nsM2MDialog());
      await s.wait(400);
      await s.click("#nsMEnt");
      await s.paste("#nsMEnt", D.USER);
      await s.click("#nsMRole");
      await s.paste("#nsMRole", D.ROLE);
      await s.click("#nsMApp");
      await s.paste("#nsMApp", D.INTEGRATION);
      await s.click("#nsMFile");
      s.set("#nsMFileName", "public.pem");
      s.note("#nsMFileName", "Only the <b>certificate</b> is uploaded. The private key stays with you.", "right");
      await s.wait(2300);
      s.clearNotes();
      await s.click("#nsMSave");
      s.closeOverlay();
      s.browser(NS.m2m(true));
      s.on("#nsM2mRow", "new");
      await s.wait(300);
      s.note("#nsM2mRow", "<b>The mapping:</b> this certificate means this user, this role, this integration, until the expiry date set when it was generated.", "bottom");
    },
  });

  step({
    chapter: "5 · Set up NetSuite",
    title: "Copy the Certificate ID and save the file",
    what: "Copy the <b>Certificate ID</b> from the new row and paste it after <code>NETSUITE_CERTIFICATE_ID=</code>. All four values are now in place. Save the file with <b>Ctrl+S</b>.",
    why: "The app sends the Certificate ID with every request for access, so NetSuite knows which certificate to check it against.",
    notes: [
      { kind: "warn", text: "This file can now sign in to your sandbox. Keep it on this PC, turn on disk encryption (BitLocker), and never email it or paste it into chat. Never keep a <b>production</b> key in a file like this: those belong only in Cloudflare's secret store." },
    ],
    async run(s) {
      s.open("browser", "explorer", "terminal", "notepad");
      s.browser(NS.m2m(true));
      await s.wait(400);
      await s.click("#nsCertId", 0.3);
      s.on("#nsCertId", "pasted");
      await s.wait(700);
      await s.switchTo("notepad", () => s.notepad(notepad({ key: true, acct: true, client: true })));
      await s.click("#vCert", 0, 0.5);
      await s.paste("#vCert", D.CERT_ID);
      await s.wait(500);
      await s.click("#nFile");
      s.note("#nFile", "<b>File &gt; Save</b>, or Ctrl+S.", "right");
      await s.wait(1500);
      s.clearNotes();
      s.note("#vKey", "A working secret. <b>Sandbox only</b>, on this PC only.", "top", "warn");
    },
  });

  // ---------------------------------------------------------------- 6 See it work
  step({
    chapter: "6 · See it work",
    title: "Restart the app",
    what: "Go back to the Command Prompt window. Press <b>Ctrl+C</b> and answer <b>Y</b> to stop the app, then run <code>npm run dev</code> again.",
    why: "The app reads <code>.dev.vars</code> once, when it starts. It will not notice the values you just saved until it is restarted.",
    async run(s) {
      s.open("browser", "explorer", "terminal", "notepad");
      s.notepad(notepad({ key: true, acct: true, client: true, cert: true }));
      await s.switchTo("terminal", () => s.terminal(running()));
      await s.wait(500);
      s.note("#tUrl", "Press <b>Ctrl+C</b> to stop it.", "bottom");
      await s.wait(1500);
      s.clearNotes();
      await s.out(["^C", "Terminate batch job (Y/N)? "], 300);
      await s.cmd("Y", 300);
      s.prompt();
      await s.cmd("npm run dev");
      await s.out(T.dev.slice(0, 4), 160);
      await s.wait(1000);
      await s.out(T.dev.slice(4), 160);
    },
  });

  step({
    chapter: "6 · See it work",
    title: "Status: connected",
    what: "In the browser, go back to the app's tab and reload <b>Status</b>. All four checks now pass.",
    why: "Each check depends on the one before. The settings are there; the app signed a request with the private key; NetSuite checked it against the certificate and returned an <b>access token</b>; and a real request for customers succeeded. The token lasts 60 minutes and is kept in Workers KV, a small store, so it is reused instead of being requested every time.",
    notes: [{ kind: "tip", text: "If a check fails here, it says why and what to fix. The most common causes are a value pasted on the wrong line, or the app not having been restarted." }],
    async run(s) {
      s.open("browser", "explorer", "terminal", "notepad");
      s.terminal([...running(), "^C", "Terminate batch job (Y/N)? Y", "", `${P}npm run dev`, ...T.dev]);
      await s.switchTo("browser", () => s.browser(app("/status", S.appStatus(false), true)));
      await s.click(".b-tool .nb:nth-child(3)");
      s.$("#bView").insertAdjacentHTML("afterbegin", '<div class="ap-progress"></div>');
      await s.wait(900);
      await s.load(app("/status", S.appStatus(true), true));
      s.note("#apBanner", "<b>Connected.</b>", "right");
      await s.wait(1700);
      s.clearNotes();
      await s.scroll("#apCheck2", 40);
      s.note("#apCheck3", "The key signed a request and NetSuite issued a <b>60-minute access token</b>, now kept in KV.", "right");
      await s.wait(3200);
      s.clearNotes();
      s.note("#apCheck4", "A real request worked, using only the <b>view-only role</b>.", "right");
    },
  });

  step({
    chapter: "6 · See it work",
    title: "Customers, live from NetSuite",
    what: "Select <b>Customers</b>. The app asks NetSuite for the first 20 customers and shows them. <b>Next</b> fetches the following 20.",
    why: "Every page is a fresh request to NetSuite's REST API, made by the app with its token. The line under the table says the token was reused from the store rather than requested again. When it nears its 60 minutes, the app quietly signs a new request and replaces it.",
    async run(s) {
      s.open("browser", "explorer", "terminal", "notepad");
      s.browser(app("/status", S.appStatus(true), true));
      await s.wait(300);
      await s.click("#apNav-customers");
      s.$("#bView").insertAdjacentHTML("afterbegin", '<div class="ap-progress"></div>');
      await s.wait(900);
      await s.load(app("/customers", S.appCustomers(1), true));
      s.note("#apShowing", "Your sandbox's customers, read through the REST API.", "bottom");
      await s.wait(2600);
      s.clearNotes();
      await s.scroll("#apFoot", 520);
      s.note("#apFoot", "The same token was <b>reused</b>, not requested again.", "top");
      await s.wait(2600);
      s.clearNotes();
      await s.scroll(0);
      await s.click("#apNext");
      s.on("#apTable", "loading");
      s.$("#bView").insertAdjacentHTML("afterbegin", '<div class="ap-progress"></div>');
      await s.wait(800);
      s.browser(app("/customers?page=2", S.appCustomers(2), true));
      s.note("#apShowing", "Page 2: another request, another 20.", "bottom");
    },
  });

  step({
    chapter: "6 · See it work",
    title: "You are connected. Before you go further",
    what: "That is the whole setup: code, tools, a certificate, a limited role in NetSuite, four settings, and a working connection. The app's <b>Documentation</b> menu explains each part in more depth.",
    why: "What you built is safe for a sandbox. Taking it further means putting the app on Cloudflare behind Zero Trust, and treating the key with more care.",
    notes: [
      { kind: "warn", text: "For production: generate a separate certificate, and store its private key only as a Cloudflare Worker secret, never on a laptop. A stolen laptop without disk encryption gives up every file on it." },
      { kind: "tip", text: "Certificates expire. Replace one by generating a new pair, uploading it as a second mapping, switching the two settings over, then revoking the old one. Nothing stops working in between. See \"Security and key rotation\" in the Documentation." },
    ],
    async run(s) {
      s.open("browser", "explorer", "terminal", "notepad");
      s.browser(app("/customers?page=2", S.appCustomers(2), true));
      await s.wait(600);
      s.overlay(`<div class="card"><h4>What just happened</h4>
        <ul>
          <li>The app <b>signed</b> a short request with the private key in <code>.dev.vars</code>.</li>
          <li>NetSuite <b>checked</b> it against the certificate and issued a 60-minute token.</li>
          <li>The app <b>kept</b> the token in Workers KV and used it to read customers.</li>
          <li>NetSuite ran each request as <b>you, with the view-only role</b>, and logged it that way.</li>
        </ul>
        <h4 style="margin-top:18px">Keep it safe</h4>
        <ul>
          <li>Sandbox on your PC. <b>Production keys only in Cloudflare.</b></li>
          <li>The smallest role that does the job. Never Administrator.</li>
          <li>Replace the certificate before it expires; revoke it at once if the key may have leaked.</li>
        </ul></div>`);
    },
  });
  step({
    chapter: "6 · See it work",
    title: "What's next?",
    what: "Three ways to go from here. You can <b>extend</b> the app by asking for changes in plain words. You <b>could deploy</b> it to Cloudflare. Or you can <b>stop here and revoke the certificate</b> in NetSuite, which is the most secure thing to do.",
    why: "This is a teaching example, not a finished integration. It shows the connection working and nothing more. Anything beyond this point is ideally done together with professional developers, who know what a real integration has to handle.",
    notes: [
      { kind: "warn", text: "Pushing ahead on your own anyway? Keep it on a NetSuite <b>sandbox</b>, keep the NetSuite role <b>read-only</b>, and keep it on a <b>secure laptop</b>: disk encryption on, screen lock on, not shared." },
      { kind: "tip", text: "This example ignores significant integration hurdles, above all NetSuite's API concurrency limits. It sends each request as it comes: it does not queue, retry or wait when NetSuite is busy." },
    ],
    async run(s) {
      s.open("browser", "explorer", "terminal", "notepad");
      s.browser(NS.m2m(true));
      await s.wait(600);
      s.note("#nsM2mRow .ns-btn", "<b>The most secure next step:</b> select <b>Revoke</b>. The key on your PC can then no longer be used to sign in.", "left");
      await s.wait(4200);
      s.clearNotes();
      s.overlay(`<div class="card wide"><h4>What's next?</h4>
        <div class="next">
          <div><h5>Extend it</h5>
            <p>Open the project folder in an editor such as VS Code, or in the Claude desktop app, and simply ask:</p>
            <blockquote>Add an Items page like the Customers page: a paginated list of inventory items read from NetSuite. Tell me which permission to add to the NetSuite role, and update the documentation.</blockquote>
          </div>
          <div><h5>Deploy it <small>you could</small></h5>
            <p>Create a Cloudflare account, then run:</p>
            <pre>npx wrangler login\nnpm run deploy</pre>
            <p><code>npm run deploy</code> builds the app, then runs <code>npx wrangler deploy</code>.</p>
            <p>The deployed app <b>refuses every visitor</b> until Cloudflare Zero Trust is set up and their email is on the app's own allow-list. That block is built in, on purpose.</p>
          </div>
          <div class="best"><h5>Or stop here <small>most secure</small></h5>
            <p><b>Revoke the certificate in NetSuite</b>, on the M2M setup page, and delete the key from <code>.dev.vars</code>.</p>
            <p>You have seen how it works. Anything beyond this point is ideally done in collaboration with professional developers.</p>
          </div>
        </div>
        <p class="strip warn"><b>Pushing ahead anyway?</b> NetSuite sandbox only &middot; read-only NetSuite role &middot; a secure laptop.</p>
        <p class="strip"><b>What this example leaves out:</b> significant integration hurdles, such as NetSuite's API concurrency limits. It does not queue, retry or back off.</p>
      </div>`);
    },
  });
})();
