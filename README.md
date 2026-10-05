# Project Desk — VibeCodeStorage example

A small local Node.js app that remembers a project name, theme and next step.
The Node backend uses the published VibeCodeStorage SDK. The browser receives
only your settings; store credentials and encryption stay on the backend.

## Run it

Install Node.js 24 or newer, then:

```sh
git clone https://github.com/pauldodd123/vibecodestorage-example.git
cd vibecodestorage-example
npm install
npm start
```

Open http://127.0.0.1:3210. Save some sample settings. Stop with Ctrl+C,
run `npm start` again, and reload. The settings return from the same store;
the backend run ID changes to demonstrate that a new process started.

Before creating a store, read the [pilot terms](https://vibecodestorage.com/terms.html)
and [privacy notice](https://vibecodestorage.com/privacy.html). This is a free,
limited pilot: 1,000 rows, 2 MB encrypted storage, 10,000 metered requests/month,
and total pilot capacity of 100 stores. Use non-sensitive sample data and keep backups.

## Credentials and safety

On first start the app creates one store and saves credentials to `.private/store.json`
with owner-only permissions. Every subsequent start reuses that file. Keep it private
and out of Git. Losing it means losing access. Never put it in a public bundle, paste
it into a prompt, or share it with us. A full copy of this file can read and delete the store.

The server binds to 127.0.0.1 and validates Host and write Origin. It is a trusted
local demo. Do not expose it publicly: a shared app needs its own authentication,
authorization and per-user data design. Optimistic versions prevent one browser tab
silently overwriting another's changes; reload when a conflict is reported.

`PORT` changes the local port. `VCS_ENDPOINT` selects a service for a newly created
store only. Existing credentials remain bound to their saved service.
`VCS_CREDENTIALS_FILE` can point to a private copy elsewhere.

To remove the demo store permanently, stop the app, then run this deliberately:

```sh
node --input-type=module -e 'import {readFile,unlink} from "node:fs/promises"; import {VibeCodeStorage} from "vibecodestorage"; const p=".private/store.json"; await new VibeCodeStorage(JSON.parse(await readFile(p,"utf8"))).destroy(); await unlink(p); console.log("Demo store deleted");'
```

The cleanup command uses the default credential path. If you configured a different
path, use that path instead. Do not delete another project's credentials.

## What to look at

- `server.mjs`: create once, privately save credentials, encrypt through the SDK,
  validate settings, and reuse a saved store after a restart.
- `public/app.js`: browser UI with no storage secrets.
- `public/`: plain HTML/CSS/JavaScript; no framework or build step.

[Website](https://vibecodestorage.com) · [SDK on npm](https://www.npmjs.com/package/vibecodestorage)
· [Send feedback / join the pilot](https://vibecodestorage.com/contact.html?topic=pilot)

This repository contains the example app only. The hosted service implementation
is private. The example code is MIT licensed; the SDK has its own license.
