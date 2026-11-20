# Cloudflare + NetSuite demo

An example of how Cloudflare can be used to integrate with NetSuite's REST API, built
to share with the **Perth NetSuite User Group**.

> This is not a SafeStyle application. It is hosted under SafeStyle's GitHub, but it
> exists only as a worked example for the user group.

**[Watch the walkthrough](https://safestyle.github.io/cloudflare-netsuite-boilerplate/)**:
the whole setup, from downloading the code to seeing your NetSuite customers, shown
step by step in your browser. Nothing to install.

## What it is

A web app that runs on [Cloudflare Workers](https://developers.cloudflare.com/workers/),
built with [React Router](https://reactrouter.com/). Today it has:

- A menu, starting with **Documentation**: step-by-step guides in two areas.
  **Cloudflare setup** covers the account sign up process. **NetSuite setup** covers
  how certificates, roles and tokens work, the integration record, OAuth 2.0 client
  credentials (M2M), allocating a concurrency limit, and security and key rotation.
- A **NetSuite certificate** page that generates the certificate and private key
  NetSuite's OAuth 2.0 client credentials (M2M) login needs, in your browser, and
  explains where to store the key: `.dev.vars` on your computer, Cloudflare Worker
  secrets when deployed.
- A **Customers** page that lists your customers, read live from NetSuite's REST API,
  a page at a time. Behind it is a small NetSuite client that signs in with the
  certificate, keeps its access token in Workers KV, and replaces it when it expires.
- A **Status** page that checks the settings, the token and a real request, and says
  what to fix when something is wrong.
- Zero Trust protection: every deployed copy only serves people signed in through
  [Cloudflare Zero Trust](https://developers.cloudflare.com/cloudflare-one/). Running
  it on your own computer skips this.

It is a basic example on purpose. It shows the connection working and fails with a
clear message when it is not set up. It does not show retries, back-off or handling
many requests at once.

## See it first: the walkthrough

**https://safestyle.github.io/cloudflare-netsuite-boilerplate/** is a simulated,
animated walkthrough of the whole setup on a Windows PC, from downloading the code to
seeing your customers, explaining what each step does and why. It runs in your
browser and needs nothing installed.

The same walkthrough is in this repository at `public/walkthrough/index.html`: open
that file from a downloaded copy, or go to http://localhost:5173/walkthrough/index.html
once the app is running. See [docs/walkthrough.md](docs/walkthrough.md).

## Use a sandbox

Connect this demo to a NetSuite **sandbox**, not production. Running it locally means
a working private key sits in a file on your computer. That is acceptable for a
sandbox and not for live data: keep production keys only in Cloudflare Worker secrets.
[Security and key rotation](docs/guides/02-netsuite/04-security-and-key-rotation.md)
explains this, and how to replace a certificate.

## Security model

Any deployed instance sits behind Cloudflare Zero Trust (Cloudflare Access). The
Worker checks the Access sign-in token on every request, including images and scripts,
and refuses anything without a valid one. It then checks the signed-in person against
its own allow-list of email addresses, so an Access policy that is too generous still
lets nobody unexpected in. If Zero Trust or the allow-list is not configured, the
deployed app refuses everything. The local dev server is the only exception. Details are in
[docs/zero-trust.md](docs/zero-trust.md).

## Set up a development environment

These steps assume a fresh Windows, macOS or Linux computer and a Claude account.

**You need:**

- Windows 10 (version 1809) or later, macOS 13 or later, or a recent Linux such as
  Ubuntu 20.04+ or Debian 10+.
- A Claude **Pro, Max, Ultra, Team or Enterprise** plan, or a Claude Console account.
  The free Claude plan does not include Claude Code.
- A Cloudflare account, but only when you want to deploy. Running locally does not
  need one.

**Open a terminal.** On Windows, use **PowerShell** (search for it in the Start
menu). On macOS, use **Terminal**. On Linux, use your usual terminal. Run each command
below in it. After installing something, close and reopen the terminal so it can find
the new program.

To only run the demo, you need Node.js (step 2) and the code (step 4, ZIP option).
Git and Claude Code are for working on it.

### 1. Install Git

| System | Command |
|--------|---------|
| Windows | `winget install --id Git.Git -e --source winget` (or download from [git-scm.com](https://git-scm.com/downloads)) |
| macOS | `xcode-select --install` |
| Ubuntu / Debian | `sudo apt install git` |
| Fedora | `sudo dnf install git` |

Check: `git --version`

### 2. Install Node.js (includes npm)

This project needs **Node.js 22.22.0 or later**. Install the current LTS version:

| System | How |
|--------|-----|
| Windows | `winget install OpenJS.NodeJS.LTS` |
| macOS | Download the LTS installer from [nodejs.org](https://nodejs.org/en/download), or `brew install node` if you use Homebrew |
| Linux | Follow [nodejs.org/en/download](https://nodejs.org/en/download). Distribution packages are often too old. |

Check: `node --version` (22.22.0 or higher) and `npm --version`

On Windows, if `npm` fails with "running scripts is disabled on this system", allow
scripts for your user once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### 3. Install Claude Code

| System | Command |
|--------|---------|
| macOS / Linux | `curl -fsSL https://claude.ai/install.sh \| bash` |
| Windows (PowerShell) | `irm https://claude.ai/install.ps1 \| iex` |

Check: `claude --version`. Other install options are in the
[Claude Code setup docs](https://code.claude.com/docs/en/setup). If you use VS Code,
the **Claude Code** extension is optional.

### 4. Get the code

On this repository's GitHub page, select **Code**. Then either:

- **Download ZIP**, and extract it to a short folder that is not synced to the cloud,
  such as `C:\dev` on Windows. Open a terminal in the extracted folder. On Windows,
  type `cmd` in File Explorer's address bar and press Enter.
- or copy the HTTPS URL and clone it with Git:

  ```bash
  git clone https://github.com/SafeStyle/cloudflare-netsuite-boilerplate.git
  cd cloudflare-netsuite-boilerplate
  ```

### 5. Install dependencies and start the app

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

In Windows Command Prompt, the second line is `copy .dev.vars.example .dev.vars`.

Open http://localhost:5173. The header shows "Local dev · Zero Trust check skipped".
Open **Status**: it says NetSuite is not set up yet, which is expected.

Wrangler, Cloudflare's command-line tool, is installed by `npm install` as part of the
project, so there is nothing else to install. Run it with `npx wrangler`.

### 6. Connect it to NetSuite

Follow the guides under **Documentation > NetSuite setup** in the app (or in
[docs/guides/02-netsuite](docs/guides/02-netsuite/README.md)). In short:

1. Generate a certificate on the app's **NetSuite certificate** page.
2. In a NetSuite sandbox, as Administrator: enable REST web services and OAuth 2.0,
   create an integration record, create a view-only role, and upload the certificate.
3. Put the four values in `.dev.vars` and restart `npm run dev`.
4. Open **Status**. When every check passes, open **Customers**.

### 7. Work on it with Claude

From the project folder, run:

```bash
claude
```

On first run, Claude Code opens your browser to sign in to your Claude account. It reads
[CLAUDE.md](CLAUDE.md) for this project's rules.

## Deploying

1. Create and set up a Cloudflare account, including Zero Trust:
   [Cloudflare account sign up process](docs/guides/01-cloudflare/01-account-sign-up.md).
2. Deploy and put the app behind Zero Trust:
   [docs/zero-trust.md](docs/zero-trust.md#setting-it-up-for-a-deployment).

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server with hot reload at http://localhost:5173 |
| `npm run build` | Production build into `build/` |
| `npm run deploy` | Build, check the build is safe to deploy, then deploy to Cloudflare |
| `npm run types` | Regenerate `worker-configuration.d.ts` and React Router route types |
| `npm run typecheck` | Regenerate types and run `tsc` |

## Documentation

Developer docs and guides are in [docs/](docs/README.md). The guides are also shown in
the app under **Documentation**.
