# Asap Bukan Filter

A small profile-picture studio to keep Indonesia's forest and land fires (karhutla) in the conversation. Built with plain HTML, CSS, JavaScript and Canvas. No dependencies, build step, database or image-upload server.

## What works

- Open a JPG, PNG or WebP locally, up to 20 MB and 50 megapixels.
- Choose Apocalyptic orange, Smoke veil, IHSG red, or Brave pink × Hero green.
- All four palettes use duotone at the default 80% intensity; 100% fully replaces the source colors. Classic colors and Reverse duotone work with every palette. Photos are desaturated before tinting. Lower intensity blends the tint with grayscale, so original hues never leak through; 0% is black and white. Smoke veil layers deterministic, soft, uneven smoke over neutral charcoal tones, keeping the central portrait area clearer. Classic softens the veil; Reverse switches to dark smoke over reversed tones. Smoke intensity controls both the base duotone and cloud opacity. The cloud field is generated locally and stays identical between preview and PNG export. View original shows the unedited colors.
- Adjust intensity, zoom and framing; compare against the original.
- Preview the circular profile crop; optionally add your own text (off by default, up to 80 characters, automatically wrapped).
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

## Pink × green reference

Inspired by the user-provided [Brave Pink Hero Green](https://brave-pink-hero-green.lovable.app/) editor. This implementation uses its pink/green color pairs as a reference and extends Classic colors / Reverse duotone to every palette; it does not reuse its app code or assets.

- Higher-contrast (default): green shadows `#165027`, pink highlights `#F99FD2`.
- Classic: green shadows `#1B602F`, pink highlights `#F784C5`.
- Reverse swaps shadows and highlights. The image luminance range is normalized and shaped with a symmetric contrast curve, then mapped between the colors. Flat images use their absolute luminance, and fully transparent pixels do not affect normalization.
- All palettes are artistic duotones, not haze simulations. The higher-contrast label describes relative luminance separation; it does not promise accessibility for every color-vision condition.

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

Automated checks cover deterministic cloud rendering, clearer-center smoke coverage, Classic/Reverse smoke behavior, full recoloring, classic and reverse modes across every palette, zero-intensity grayscale, alpha preservation, caption wrapping, and crop bounds across landscape, portrait and square sources. Browser verification completed: PNG upload, smoke-grey selection, intensity and crop controls, original comparison, circle guide, campaign overlay, PNG download, caption copying, privacy dialog and 390-pixel mobile layout. The downloaded PNG was verified as 1080 × 1080. The new pink/green default preview was visually checked; its classic/reverse variants are covered by automated checks. A browser permission block prevented completing the new interactive export retest. Automated tests cover all four palettes; HEIC conversion, every browser/device and ad-network integration are not tested.

## License

MIT. Includes the original demo illustration and application code.
