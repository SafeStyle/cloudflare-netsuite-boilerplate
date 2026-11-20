# The walkthrough

`public/walkthrough/` is a simulated, animated walkthrough of the whole setup on a
Windows PC: download the code as a ZIP, install Node.js, run the app, generate a
certificate, set up a NetSuite sandbox, fill in `.dev.vars`, and see customers. It is
for people deciding whether to try the demo, and for following along while doing it.

It is plain HTML, CSS and JavaScript: no build step, no libraries, no network
requests. Everything on screen is drawn for the walkthrough. There are no real logos
or screenshots, and every name, ID, key and customer is made up.

## Viewing it

| Where | How |
|-------|-----|
| Anywhere, with nothing installed | https://safestyle.github.io/cloudflare-netsuite-boilerplate/ (GitHub Pages). The README links here. |
| From a downloaded copy | Open `public/walkthrough/index.html` in a browser. It works straight from disk. |
| While the app runs locally | http://localhost:5173/walkthrough/index.html, also linked from the app's home page |
| On a deployed copy | `/walkthrough/index.html`, **after signing in through Zero Trust** |

A deployed Worker serves nothing without a signed-in Zero Trust user, static files
included, and the walkthrough is no exception. Do not add a public route for it
([zero-trust.md](zero-trust.md)). The public copy is on GitHub Pages instead, which is
separate from the app.

## Publishing to GitHub Pages

`.github/workflows/pages.yml` publishes the `public/walkthrough/` folder, and nothing
else, to GitHub Pages. It runs on every push to `main` that changes that folder or the
workflow, and can be run by hand from the repository's **Actions** tab.

- The repository's **Settings > Pages > Source** must be **GitHub Actions**. This is
  set once.
- A change is live a minute or so after it is pushed. Nothing needs building: the
  folder is published as it is.
- GitHub only renders a repository's HTML files through Pages. A link to
  `public/walkthrough/index.html` on github.com shows its source, which is why the
  README links to the Pages address.
- In a fork, turn Pages on in the fork's settings, and change `OWNER` in
  `screens.js` and the links in `README.md` to the fork's address.

The link at the top right of the walkthrough goes to the app's documentation when
the app is serving it, and to the code on GitHub everywhere else.

Links can open at a step and start playing:

- `index.html#step-12` opens at step 12.
- `index.html?play` starts straight away; `?play=step` plays one step and stops.
- `index.html?speed=2` sets the speed.

## Files

| File | What it is |
|------|------------|
| `index.html` | The page: stage, explanation panel, controls, timeline |
| `engine.js` | The player, the simulated desktop (browser, File Explorer, Command Prompt, Notepad) and the helpers steps use |
| `steps.js` | The script: one entry per step, in order |
| `screens.js` | The pages shown in the simulated browser: GitHub, nodejs.org, Cloudflare docs, this app, NetSuite |
| `walkthrough.css` | The player and the desktop |
| `screens.css` | The pages in `screens.js` |

The scripts are ordinary `<script>` files sharing one global, `WT`, not ES modules,
because browsers refuse to load modules from `file://`.

## How a step works

```js
step({
  chapter: "3 · Run it locally",        // groups steps in the timeline
  title: "Start the app",
  what: "Type <code>npm run dev</code>...",   // shown beside the screen
  why: "<b>localhost</b> means...",          // optional
  notes: [{ kind: "tip", text: "Leave this window open." }],  // "tip" or "warn"
  async run(s) {
    s.terminal([...]);                  // 1. draw the screen as it is at the start
    await s.cmd("npm run dev");         // 2. animate
    await s.out(["..."]);
    s.note("#tUrl", "The app's address.", "bottom");   // label something on screen
  },
});
```

**Every `run()` draws its starting screen from scratch**, because any step can be
jumped to from the timeline. Do not rely on what the previous step left behind.

The helpers on `s`:

| Helper | Does |
|--------|------|
| `s.browser({ url, tabs, html })`, `s.terminal(lines)`, `s.notepad({...})`, `s.explorer({...})` | Show that app with this content, at once |
| `await s.go(url, page)` | Type an address and load a page |
| `await s.load(page)` | Load a page after a click |
| `await s.click(sel)`, `await s.move(sel)` | Move the pointer and click |
| `await s.type(sel, text)`, `await s.paste(sel, text)` | Fill a field |
| `await s.cmd(text)`, `await s.out(lines)`, `s.prompt()` | Type a command, print output, show a new prompt |
| `await s.switchTo(app, setup)` | Click a taskbar icon and show that app |
| `s.note(sel, html, pos, kind)`, `s.clearNotes()` | A label pointing at something. `pos`: right, left, top, bottom. `kind`: info or warn |
| `s.overlay(html)`, `s.closeOverlay()` | A dialog or context menu |
| `s.on(sel, cls)`, `s.off(sel, cls)`, `s.show(sel)`, `s.hide(sel)`, `s.set(sel, html)` | Change something on screen |
| `await s.wait(ms)` | Pause. All waits respect the speed setting and the Pause button |

Point `s.note()` at something small. It draws a ring around the target, and a ring
around a whole window explains nothing.

Class names in the two CSS files share one page. Prefix new ones (`gh-`, `ns-`, `ap-`
and so on) so they do not collide with the player's.

## Changing what it shows

- **The GitHub account in the address bar** is `OWNER` at the top of `screens.js`. It
  is the account that hosts the repository.
- **All other names and values** (user, company, account ID, versions) are in the same
  `D` object.

## Keeping it true

The walkthrough repeats things that are defined elsewhere. When one of these changes,
change the walkthrough in the same commit:

| If this changes | Update |
|-----------------|--------|
| The Home, Status, Customers or NetSuite certificate pages (`app/routes/`) | `S.app*` in `screens.js` |
| The menu (`app/lib/menu.ts`) | `appMenu` in `screens.js` |
| The setup commands in `README.md` | The terminal steps in `steps.js` |
| The NetSuite steps in `docs/guides/02-netsuite/` | Chapter 5 in `steps.js` and the `S.ns*` screens |
| The names of the settings in `.dev.vars.example` | `vars()` in `steps.js` |
| How the app is deployed (`npm run deploy`, the Zero Trust check) | The last step, "What's next?", in `steps.js` |

## Checking a change

Open `index.html?play=step#step-N` and watch the step. To check every step without
watching, load each one in headless Chrome and look for console warnings; a helper
that cannot find its target logs `walkthrough: nothing matches <selector>`:

```bash
google-chrome --headless --enable-logging=stderr --virtual-time-budget=90000 \
  --run-all-compositor-stages-before-draw --screenshot=step.png \
  "file://$PWD/public/walkthrough/index.html?play=step&speed=6#step-12"
```

Without `--run-all-compositor-stages-before-draw`, labels that fade in can look
half-transparent in the screenshot. That is the capture, not the page.
