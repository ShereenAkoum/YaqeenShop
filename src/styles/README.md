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
| Brand colors, UI color roles, homepage aliases and CRM tokens | `shared/tokens.css` |
| Reset and typography | `shared/base.css` |
| Buttons, utilities, branding, loaders and not-found state | `shared/components.css` |
| Fonts and animation definitions | `shared/fonts.css`, `shared/animations.css` |

`routeScope.ts` maps React Router paths to the `data-style-area` and `data-style-screen` attributes on `<html>`. App updates these attributes in a layout effect before painting a route change. No layout wrappers are added.

Change branding colors in the `:root` block in `shared/tokens.css`. The `--yaqeen-*` variables define the palette; `--primary`, `--surface`, `--text`, `--border` and the other UI roles reference it. Homepage `--home-*` aliases inherit from the same palette. Footer shades have named variables so they remain adjustable without searching through screen styles. Status colors and individual decorative shades remain local when they have a separate purpose. Use `var(--primary)` for a primary action or `var(--yaqeen-gold)` for an explicit brand accent; do not redeclare a variable as `--primary: var(--primary)` because that creates a cycle.

Screen rules start with `:where(html[data-style-screen="..."])`. The guard has zero specificity, so existing selector specificity is retained. Keep this guard on **every selector**, including each selector in a comma-separated list and rules inside media queries. Area-wide rules use `data-style-area` instead. Shared component classes can be used by several screens; modify their shared file only when the change is intended for all consumers.

The `operations.css` screen scope covers production, deliveries and payments because they share one component and fulfillment forms. Production-only changes should target `.production-page` or `.production-*`; common fulfillment changes should target `.fulfillment-*`.

When adding a screen, create its stylesheet, add its import in `src/styles.css`, and update `routeScope.ts`. Keep fonts first, shared styles before screen styles, and existing override order within a file. Do not append screen overrides to the import entry point.

Run `node scripts/check-styles.cjs` to check stylesheet imports, route mappings and CSS isolation, then `npm run build` for TypeScript and production CSS compilation.

Homepage layout rules use normal specificity and source order. Keep editorial story rules scoped through `.home-redesign` so generic CMS story rules cannot override the mobile layout. The homepage's remaining `!important` suppresses transitions for reduced-motion accessibility. Shared header, drawer, and footer rules also use normal priority; mobile header controls are scoped through `.header-actions` to preserve their sizing on the homepage. Global logo priority is retained outside the store area while storefront logo layouts control their own display.

Run `node scripts/prune-unused-css.cjs` for a conservative unused-selector audit. It scans source strings, JSX class names, selector queries, conditional fragments and template literals, retaining dynamic class prefixes. It proposes removing a selector only when a required class outside functional pseudo-classes is absent. Negations, alternatives, escaped identifiers, and uncertain runtime cases are retained. Review the report before applying it with `--write`, then run the build and browser comparisons. `--self-test` checks the selector safeguards. This audit does not attempt to remove every overridden declaration or infer usage solely from browser coverage.

For browser comparisons, start the dev server and run `node scripts/visual-check-css.cjs`. It uses an installed Playwright package (including Windows `npx` installations), saves screenshots and a JSON report in the system temporary directory, and compares computed styles against CSS read from `main` without changing branches. Local CSS imports are expanded from that revision. `VISUAL_CHECK_BASE_REF` can select an earlier commit for comparisons after merging. Animations and transitions are disabled for repeatable comparisons.

`VISUAL_CHECK_ALLOW_HOME_COLORS=1` accepts color-only homepage differences when validating the corrected homepage palette aliases. The report still records those differences, and layout differences or changes on other screens still fail.

Set `VISUAL_CHECK_WIDTHS` to comma-separated viewport widths to compare responsive boundaries, for example `375,390,391,700,701,760,761,900,1024,1440`. The default remains `1440,390`.

`VISUAL_CHECK_HOME_VARIANTS=1` adds local browser copies of top-picks products and sample CMS banner/newsletter sections on the home route, comparing their styles against the selected baseline too. It does not modify published CMS data.

For contact validation styles, set `VISUAL_CHECK_ROUTES=/contact` and `VISUAL_CHECK_CONTACT_FIELD=input` or `textarea`. The check marks the selected field invalid and focuses it locally, without submitting the form.

For checkout validation styles, use `VISUAL_CHECK_ROUTES=/checkout`, `VISUAL_CHECK_CART=1`, and `VISUAL_CHECK_CHECKOUT_FIELD=input` or `textarea`. This uses browser fixture data without placing an order.

Set `VISUAL_CHECK_ROUTES=/faq` and `VISUAL_CHECK_FAQ_OPEN=1` to compare the expanded first FAQ question after clicking its summary.

Set `VISUAL_CHECK_ROUTES=/search` and `VISUAL_CHECK_SEARCH_QUERY` to type a query and compare the resulting search layout after its response loads.

`VISUAL_CHECK_STORE_CHROME=1` clicks the footer groups and opens the mobile navigation drawer at widths up to 760px, comparing their interactive states against the baseline.

Set `VISUAL_CHECK_ADMIN=1` to mount the actual admin components with empty local API fixtures and exercise add dialogs. Temporary fixture files are removed after the run. Set `VISUAL_CHECK_CART=1` to populate cart and confirmation data only in the test browser, or `VISUAL_CHECK_PRODUCT=1` to include a published product from the shop. No order is submitted. `VISUAL_CHECK_BROWSER` selects `chromium` (default), `firefox`, or `webkit`; `VISUAL_CHECK_ROUTES` optionally limits the routes as a comma-separated list. Authenticated staff flows and saved-record edit/view dialogs require separate checks with an appropriate test account or richer fixtures.
