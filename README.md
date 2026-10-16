# Asap Bukan Filter

A small profile-picture studio to keep Indonesia's forest and land fires (karhutla) in the conversation. Built with plain HTML, CSS, JavaScript and Canvas. No dependencies, build step, database or image-upload server.

## What works

- Open a JPG, PNG or WebP locally, up to 20 MB and 50 megapixels.
- Choose Apocalyptic orange, Industrial smoke grey, Peatland sepia or Afterburn blue.
- Adjust intensity, zoom and framing; compare against the original.
- Preview the circular profile crop; optionally add a campaign message.
- Download a 1080 × 1080 PNG and copy an Indonesian campaign caption.
- Responsive layout, keyboard controls, privacy/about dialog and labeled future ad space.

Images stay in browser memory. Exports are newly encoded PNGs without the source file's metadata. Nothing automatically posts to or changes a social account. The demo is an original SVG illustration, not a photograph of actual haze.

## Run locally

Node.js 20 or newer:

```sh
npm run dev
```

Open http://127.0.0.1:4173. No installation is required.

```sh
npm test
npm run check
```

## Publish on Netlify

Import this GitHub repository in Netlify. Leave the build command empty and use **dist** as the publish directory. `netlify.toml` supplies that setting and security headers. Connect the `main` branch for automatic deployments.

For a manual deploy, upload the contents of `dist` through Netlify's deploy interface. For Git-connected hosting, Netlify will apply the headers in `netlify.toml` automatically; for manual folder deploys, the included `dist/_headers` applies them.

See [Netlify's deployment documentation](https://docs.netlify.com/deploy/create-deploys/).

## Social profile import: next phase

Provider-specific sign-in can make profile import possible. Google's OpenID Connect response can include a `picture` URL; it is not guaranteed. See [Google's documentation](https://developers.google.com/identity/openid-connect/openid-connect).

Keep upload as the universal fallback. Before implementing another social provider, verify its current API eligibility, permissions, review process and pricing. Do not promise personal Instagram imports without verifying support. Importing a profile image and changing a user's profile image are separate capabilities.

Implementation work would include provider app registration, an approved callback domain, token validation with the official SDK, least-privilege scopes, image-fetch/CORS handling, and an updated privacy disclosure. Never put a client secret in this static site. The current Content Security Policy intentionally permits no network API calls; update it narrowly if sign-in is introduced.

## Ads and revenue

The ad space is a placeholder; no ad network, tracking or revenue is active. Add the owner's real publisher ID only after account/site approval. [AdSense checks each added site](https://support.google.com/adsense/answer/12169212?hl=en). Approval and earnings aren't guaranteed.

Before enabling a network, update the privacy information and any required consent flow, add its supplied `ads.txt` record, and narrowly update Content Security Policy in both `netlify.toml` and `dist/_headers`. Keep ads outside the editor and away from upload/download controls. A clearly labeled direct sponsorship is another option. Never imply ad revenue is donated unless there is a real, disclosed commitment.

The first business milestone is repeat sharing and visitors, followed by an ad pilot with actual traffic. This version intentionally has no analytics; choose a measurement approach and disclose it before adding tracking.

## Campaign content

The colors are artistic interpretations, not measurements or a visualization of current local conditions. The page links to [BNPB's 2026 karhutla dashboard](https://gis.bnpb.go.id/karhutla2026/) for further information; it does not pull live data. Update this dated link in future years. This project is independent and unaffiliated with BNPB.

## Verification

Automated checks cover zero-intensity identity, palette differences, alpha preservation, color behavior, and crop bounds across landscape, portrait and square sources. Browser checks should include loading a real photo, all presets, comparison, crop controls, download, invalid files, mobile layout and caption/privacy dialogs.

## License

MIT. Includes the original demo illustration and application code.
