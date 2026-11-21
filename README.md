# Morrow Supply

> Useful things. Chosen well.

Morrow Supply is a frontend-only storefront for everyday tech and workspace products. It uses HTML, CSS, vanilla JavaScript, and an XML catalogue. There is no server, account system, payment gateway, or order fulfilment.

## Pages

- `index.html` — homepage and XML-powered featured products
- `shop.html` — searchable, filterable, sortable product catalogue
- `product.html` — product details selected with `?id=P001`
- `cart.html` — persistent cart and delivery calculation
- `checkout.html` — validated demo checkout
- `order-success.html` — confirmation for the current browser session
- `about.html` and `contact.html` — brand and contact information

## Product catalogue

Product information is maintained in `data/products.xml` and fetched at runtime with the browser Fetch API. `js/main.js` parses the XML and validates required fields, unique IDs, prices, and stock before pages use products. Product images are SVG files in `assets/images/`.

## Cart and orders

The cart uses localStorage under `morrowCart` as `{ "P001": 2 }`, preserving the key used by the existing site. The documented `morrow_cart` key is read and copied forward only when `morrowCart` is absent; the source value is retained. The cart persists in this browser and does not sync across devices. If browser storage is unavailable, the site reports that it could not save changes.

Delivery is ₹99 for subtotals below ₹2,500 and free at ₹2,500 or more. Checkout rechecks catalogue stock and calculates totals again before creating a demo order. The order is stored in sessionStorage for the confirmation page. No payment is processed and no order is sent to a server. Contact form submission is also a local demonstration and does not deliver a message.

## Run locally

The catalogue is fetched over HTTP, so do not open the HTML files directly with `file://`. From the project directory, run a local static server, for example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` deploys the repository contents to GitHub Pages when changes are pushed to `main`, or when manually triggered. All paths are relative so the site works from a repository subpath.

## Project structure

```text
├── index.html, shop.html, product.html
├── cart.html, checkout.html, order-success.html
├── about.html, contact.html
├── css/style.css
├── js/main.js, products.js, shop.js, product.js, cart.js, checkout.js
├── data/products.xml
├── assets/images/*.svg
└── .github/workflows/pages.yml
```
