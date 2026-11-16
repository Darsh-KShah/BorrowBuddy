# BorrowBuddy API

The backend is a TypeScript Express API under `/api/v1`. It uses MongoDB Atlas when
`MONGODB_URI` is configured. No payment, paid-rental, delivery or chat endpoints are
implemented because those are excluded by the approved product contract.

## Setup

```bash
cp .env.example .env
# Set MONGODB_URI and two non-placeholder JWT secrets in .env
npm install
npm run build
npm run dev
```

Health: `GET http://localhost:4000/health` from the development computer. The
development server defaults to `HOST=0.0.0.0` and `PORT=4000` so a physical Android
device can reach it over the same LAN. Set `HOST=127.0.0.1` when only local access is
needed.

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` to
enable signed image uploads. Without them, the endpoint returns a configuration error
and non-empty image metadata is rejected. Cloudinary upload responses are accepted only
when their public ID and secure URL match the configured BorrowBuddy folder/cloud.

The physical Android device must use the computer's LAN address, not `localhost`.
Start the mobile app with `EXPO_PUBLIC_API_URL=http://<computer-lan-ip>:4000/api/v1`.
This LAN binding is for development only: keep the computer firewall enabled, connect
only trusted devices to the development network, and do not forward port 4000 from
the router or expose it to the public internet. Use `HOST=127.0.0.1` outside device
testing or configure a deliberate production network boundary.

Implemented core routes include registration/login/refresh/logout/me, public listing
browse/details, listing creation/edit/deactivation, signed upload authorization, sale
and free-borrow requests, guarded approval/rejection/withdrawal, quantity-aware
inventory, pre-handover cancellation, two-sided handover/receipt/return actions,
notifications, inclusive date validation and completed-transaction reviews.
Paid fee negotiation and provider payment adapter execution remain pending provider
onboarding; reports/admin remain pending.
