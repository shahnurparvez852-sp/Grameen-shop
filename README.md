# Grameen Shop / Parvez Shop — Permanent Product Images

This version is prepared for GitHub + Render deployment with permanent product image storage.

## How it works
- Website code: GitHub
- Website hosting: Render
- Product/order database: SQLite (as in the original project)
- Product images: Cloudinary

**Important:** Do not save uploaded product images only inside the Render project. Render can restart/redeploy, so uploaded local files are not a reliable permanent image store.

## Cloudinary setup
1. Create a free Cloudinary account.
2. Open the Cloudinary Dashboard.
3. Copy these three values:
   - Cloud name
   - API Key
   - API Secret
4. In Render → your service → Environment, add:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
5. Save and redeploy.

## Admin product image upload
Open `/admin.html`, log in, then add a product and select an image. Supported formats: JPG, PNG, WEBP, GIF. Maximum file size: 5 MB.

The uploaded image is stored in Cloudinary under `grameen-shop/products`, and its permanent HTTPS URL is saved in the product database.

## Notes
- Existing products without images will continue to show their emoji fallback.
- New uploaded images will survive normal Render restarts/redeploys because they are stored outside Render.
- Keep `CLOUDINARY_API_SECRET` private. Never put it in frontend JavaScript or commit it to GitHub.
