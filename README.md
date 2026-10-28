# Kids Town

A 3D educational town game for kids aged 7 to 10. Built with Babylon.js,
TypeScript and Vite, and installable on phones as a Progressive Web App.

See `CLAUDE.md` for the full design and build plan.

## Play it

https://loiybadawi1997.github.io/kids-game/

On a phone, open the link, then:

- **iPhone (Safari):** Share button → "Add to Home Screen".
- **Android (Chrome):** ⋮ menu → "Add to Home screen" / "Install app".

The installed app opens full screen in landscape and works offline.

## Work on it

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install
npm run dev      # local server; also prints a network URL you can open on your phone (same Wi-Fi)
npm run build    # checks types and builds the site into dist/
npm run preview  # serves the built site, like it will be online
```

## Deploying

Every push to `main` builds the site and publishes it to GitHub Pages
(see `.github/workflows/deploy.yml`).
