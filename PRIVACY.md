# Privacy

Porter shows which ports are in use on your computer and which programs hold
them. It has no account, no analytics, no telemetry and no server of its own.
Nothing it sees about your computer is sent anywhere.

## What it reads

Porter reads your computer's port table and the names and IDs of the programs
holding those ports, and only on your computer. It ends a program only when
you ask it to.

## What it keeps

Your settings stay on this computer, in the app's own storage
(`com.triptoafsin.porter`):

- the ports to watch and the ones you pinned
- the theme, size and list preferences
- the version of an update you chose to skip

Uninstalling Porter and deleting that folder removes them.

## When it goes online

Porter connects to one other system: **GitHub, to check for a new version.**
It asks for the latest Porter release when it opens and every six hours after.
GitHub sees your IP address; the request carries nothing about you or your
ports. Links in the app, such as the release page, open in your own browser.

## Downloads

Release files are hosted on GitHub. Each release has a `SHA256SUMS.txt` so you
can check a download is the file that was built.

## Questions

Open an issue at <https://github.com/t21dev/porter-app/issues>. This policy
changes only with the app, and the changes show in this file's history.
