# Parvez Shop — Real Store Starter

This is a deployable full-stack store starter.

### Features
- Real product database (SQLite)
- Real order creation and stock reduction
- Customer checkout form
- Cash on Delivery
- Manual bKash/Nagad payment option
- Admin login
- Admin order dashboard
- Order status management
- Add products and stock
- Mobile responsive storefront

### Run locally
1. Install Node.js 18+.
2. Open this folder in a terminal.
3. Run `npm install`
4. Copy `.env.example` to `.env` and change ADMIN_PASSWORD and SESSION_SECRET.
5. Run `npm start`
6. Open http://localhost:3000
7. Admin: http://localhost:3000/admin.html

### Before public launch
- Use HTTPS.
- Set strong ADMIN_PASSWORD and SESSION_SECRET.
- Put the database on persistent storage.
- Configure a production session store.
- Add real bKash/Nagad merchant API credentials if online payment is required.
- Add shipping charges and delivery-zone rules.
- Add product images and your real product catalog.
