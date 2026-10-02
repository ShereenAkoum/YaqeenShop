# Stylesheet ownership

`src/styles.css` is the import entry point. Edit the owning file below for a screen change.

| Screens | Stylesheet |
| --- | --- |
| Home, shop, product, cart, checkout, confirmation, search | `store/<screen>.css` |
| About, contact, FAQ, legal, construction, other content pages | `store/<screen>.css` |
| Dashboard, categories, products, inventory, resources, designs, orders, customers | `admin/<screen>.css` |
| Inbox, users, audit, website, reports, settings | `admin/<screen>.css` |
| Production, deliveries, payments | `admin/operations.css` (shared Operations component) |
| Staff login and access-denied cards | `login.css` |
| Store navigation, footer, product cards and other reusable store elements | `store/shared.css` |
| Admin navigation, tables, reusable editors and dialogs | `admin/shared.css` |
| Theme tokens, reset and typography | `shared/base.css` |
| Buttons, utilities, branding, loaders and not-found state | `shared/components.css` |
| Fonts and animation definitions | `shared/fonts.css`, `shared/animations.css` |

`routeScope.ts` maps React Router paths to the `data-style-area` and `data-style-screen` attributes on `<html>`. App updates these attributes in a layout effect before painting a route change. No layout wrappers are added.

Screen rules start with `:where(html[data-style-screen="..."])`. The guard has zero specificity, so existing selector specificity is retained. Keep this guard on **every selector**, including each selector in a comma-separated list and rules inside media queries. Area-wide rules use `data-style-area` instead. Shared component classes can be used by several screens; modify their shared file only when the change is intended for all consumers.

The `operations.css` screen scope covers production, deliveries and payments because they share one component and fulfillment forms. Production-only changes should target `.production-page` or `.production-*`; common fulfillment changes should target `.fulfillment-*`.

When adding a screen, create its stylesheet, add its import in `src/styles.css`, and update `routeScope.ts`. Keep fonts first, shared styles before screen styles, and existing override order within a file. Do not append screen overrides to the import entry point.

Run `node scripts/check-styles.cjs` to check stylesheet imports, route mappings and CSS isolation, then `npm run build` for TypeScript and production CSS compilation.

For browser comparisons, start the dev server and run `node scripts/visual-check-css.cjs`. It uses an installed Playwright package (including Windows `npx` installations), saves screenshots and a JSON report in the system temporary directory, and compares computed styles against CSS read from `main` without changing branches. Animations and transitions are disabled for repeatable comparisons.

Set `VISUAL_CHECK_ADMIN=1` to mount the actual admin components with empty local API fixtures and exercise add dialogs. Temporary fixture files are removed after the run. Set `VISUAL_CHECK_CART=1` to populate cart and confirmation data only in the test browser, or `VISUAL_CHECK_PRODUCT=1` to include a published product from the shop. No order is submitted. `VISUAL_CHECK_BROWSER` selects `chromium` (default), `firefox`, or `webkit`; `VISUAL_CHECK_ROUTES` optionally limits the routes as a comma-separated list. Authenticated staff flows and saved-record edit/view dialogs require separate checks with an appropriate test account or richer fixtures.
