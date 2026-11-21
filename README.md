# Morrow Supply — Online Shopping Website

## Lab 12: Online Shopping Website using HTML, CSS, JavaScript and XML

> **"Useful things. Chosen well."**

---

## Project Overview

This project was built as part of the Web Programming Lab 12 practical assignment. The goal was to design and implement a fully functional multi-page online shopping website using only front-end technologies — HTML, CSS, JavaScript, and XML — without any back-end framework or database. The result is **Morrow Supply**, a fictional online store selling everyday tech and workspace products, complete with a live product catalogue, shopping cart, checkout flow, and order confirmation.

---

## Technologies Used

| Technology | Role |
|---|---|
| **HTML5** | Semantic page structure across all 8 pages; accessibility attributes (`aria-*`, roles, labels) |
| **CSS3** | Complete design system using custom properties; responsive layout with Flexbox and Grid; no external UI library |
| **Vanilla JavaScript** | Product rendering, cart logic, form validation, XML parsing via `fetch()` and `DOMParser` |
| **XML** | Product catalogue stored in `data/products.xml`; parsed at runtime — no hardcoded product arrays anywhere |



---

## Pages

| File | Page | Description |
|---|---|---|
| `index.html` | **Home** | Editorial hero, featured products, brand introduction |
| `shop.html` | **Shop** | Full product catalogue with search, filter by category, and sort controls |
| `product.html` | **Product Detail** | Individual product page loaded dynamically via URL query param (`?id=P001`) |
| `cart.html` | **Cart** | Table-style cart with quantity controls, subtotal, delivery cost, and order total |
| `checkout.html` | **Checkout** | Delivery and payment details form with client-side validation |
| `order-success.html` | **Order Confirmation** | Post-checkout confirmation page with order summary pulled from `sessionStorage` |
| `about.html` | **About** | Brand story and editorial layout |
| `contact.html` | **Contact** | Two-column contact form with inline validation and info block |

---

## XML Integration

All product data lives in `data/products.xml`. Each `<product>` element contains fields like `<id>`, `<name>`, `<category>`, `<price>`, `<stock>`, `<featured>`, and `<description>`.

At runtime, `js/products.js` uses the browser's `fetch()` API to request the XML file over HTTP, then hands the response text to `DOMParser` to build a live DOM tree:

```js
const response = await fetch('./data/products.xml');
const text = await response.text();
const xmlDoc = new DOMParser().parseFromString(text, 'text/xml');
```

Product nodes are then queried with standard DOM methods (`getElementsByTagName`, `querySelector`) and converted into plain JavaScript objects. This approach means the product catalogue can be updated just by editing the XML file — no JavaScript changes required.

> **Note:** Because `fetch()` enforces the same-origin policy, the site must be served over HTTP. Opening `index.html` directly from the file system (`file://`) will cause fetch to fail. Use Live Server or any local HTTP server.

---

## Shopping Cart

The cart is stored entirely in `localStorage` under the key `morrow_cart` as a plain JSON object mapping product IDs to quantities:

```json
{ "P001": 2, "P004": 1 }
```

When the cart page loads, it fetches `products.xml`, looks up each product by ID, and renders the line items with live prices. Key behaviours:

- **INR pricing only** — no USD or foreign currency anywhere.
- **Stock limits** — users cannot add more units than the `<stock>` value in the XML.
- **Free delivery threshold** — orders over ₹2,500 ship free; below that, a flat ₹99 delivery charge applies.
- Cart count in the header updates on every page load.

---

## Features

- **Search** — keyword search across product names and descriptions on the shop page
- **Filter** — filter by category using buttons derived from the XML catalogue
- **Sort** — sort by price (low-to-high, high-to-low) or by name
- **Cart** — persistent cart via localStorage with quantity controls and stock enforcement
- **Checkout** — multi-field checkout form with client-side validation (no `alert()`)
- **Order Confirmation** — dynamically rendered order summary from `sessionStorage`
- **Responsive Design** — fully responsive at 1200 px, 768 px, and 480 px breakpoints
- **Accessible markup** — semantic HTML, ARIA labels, keyboard-navigable, visible focus indicators

---

## INR Currency

All prices are displayed using the `Intl.NumberFormat` API, which handles Indian number formatting (lakhs, thousands) automatically:

```js
const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

// Usage:
inrFormatter.format(2999); // → "₹2,999"
inrFormatter.format(14999); // → "₹14,999"
```

This formatter is defined once in `js/main.js` and used across every page that displays a price — the cart, product cards, product detail, checkout summary, and order confirmation.

---

## Project Structure

```
Lab12/
├── index.html
├── shop.html
├── product.html
├── cart.html
├── checkout.html
├── order-success.html
├── about.html
├── contact.html
├── README.md
├── .gitignore
│
├── data/
│   └── products.xml
│
├── css/
│   └── style.css
│
├── js/
│   ├── main.js          ← shared utilities (cart, nav, INR formatter)
│   ├── products.js      ← XML loading and product rendering
│   ├── shop.js          ← search, filter, sort logic
│   ├── product.js       ← product detail page logic
│   ├── cart.js          ← cart page logic
│   ├── checkout.js      ← checkout form and validation
│   └── order-success.js ← order confirmation rendering
│
├── assets/
│   └── images/          ← product SVG illustrations
│
└── .github/
    └── workflows/
        └── pages.yml    ← GitHub Actions deploy workflow
```

---

## Local Setup

> **Important:** Do not open `index.html` directly by double-clicking. The `fetch()` call used to load `products.xml` will be blocked by browser security when running from the `file://` protocol. You must serve the project over HTTP.

**Steps:**

1. **Clone the repository**
   ```bash
   git clone https://github.com/madhur-sudo/lab12-online-shopping-website.git
   cd lab12-online-shopping-website
   ```

2. **Open in VS Code**
   ```bash
   code .
   ```

3. **Install the Live Server extension** (if not already installed)
   - Open Extensions (`Ctrl+Shift+X`)
   - Search for **Live Server** by Ritwick Dey
   - Click Install

4. **Start the server**
   - Right-click `index.html` in the Explorer panel → **Open with Live Server**
   - Or click the **Go Live** button in the VS Code status bar

5. **Visit the site**
   - [http://localhost:5500](http://localhost:5500)
   - or [http://127.0.0.1:5500](http://127.0.0.1:5500)

---

## GitHub Repository

[https://github.com/madhur-sudo/lab12-online-shopping-website](https://github.com/madhur-sudo/lab12-online-shopping-website)

---

## Live Demo

[https://madhur-sudo.github.io/lab12-online-shopping-website/](https://madhur-sudo.github.io/lab12-online-shopping-website/)

Deployed automatically via GitHub Actions on every push to `main`. See `.github/workflows/pages.yml` for the workflow configuration.

---

## Notes for Submission

- All product data is loaded from `data/products.xml` at runtime — no product information is hardcoded in JavaScript or HTML.
- The checkout and contact forms use inline validation with no `alert()` calls; errors appear in context next to the relevant field.
- The cart, order summary, and form state all use browser storage APIs (`localStorage`, `sessionStorage`) — no server or database is involved.
- Prices are in Indian Rupees throughout. The `inrFormatter` instance in `main.js` is the single source of truth for currency formatting.
- The site is fully responsive and has been tested at mobile (320 px), tablet (768 px), and desktop (1280 px) widths.
