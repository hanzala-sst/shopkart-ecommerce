# ShopKart

A full-stack e-commerce application built with **React, Node.js, Express, and MongoDB** across Engineering Labs 01–06.

ShopKart includes user authentication, a product catalogue, wishlist, shopping cart, checkout with Razorpay Test Mode, and order history.

## Features

- **Authentication:** Registration, login, protected user profile, and logout.
- **Product Catalogue:** Browse products, search by name, filter by category, and view product details.
- **Wishlist:** Save and remove products with persistent storage.
- **Shopping Cart:** Add products, update quantities, remove items, and calculate totals with stock validation.
- **Checkout & Payments:** Shipping address validation, server-side price and stock checks, and Razorpay Test Mode integration.
- **Order Management:** Purchase-time order snapshots, payment verification, order confirmation, and order history.
- **Responsive UI:** Consistent navigation, shared cart state, and loading, empty, and error states.

## Tech Stack

| Area | Technologies |
|---|---|
| Frontend | React, Vite, React Router |
| Styling | CSS |
| API Requests | Axios |
| State Management | React Context API |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | JWT, bcrypt, HttpOnly cookies |
| Payments | Razorpay Standard Checkout — Test Mode |

## Project Structure

```text
SHOPKART/
├── shopkart-backend/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── test_lab06_and_regressions.js
│   ├── index.js
│   └── package.json
│
├── shopkart-frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
└── README.md
```

## Getting Started

### Prerequisites

- Node.js and npm
- MongoDB database, such as MongoDB Atlas
- Razorpay Test Mode API keys

### 1. Clone the repository

```bash
git clone https://github.com/hanzala-sst/shopkart-ecommerce.git
cd shopkart-ecommerce
```

### 2. Configure and start the backend

```bash
cd shopkart-backend
npm install
```

Create a `.env` file inside `shopkart-backend/`:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
PORT=5000
RAZORPAY_KEY_ID=your_razorpay_test_key_id
RAZORPAY_KEY_SECRET=your_razorpay_test_key_secret
```

Replace the placeholders with your own configuration.

Start the backend:

```bash
npm run dev
```

The backend normally runs at `http://localhost:5000`.

### 3. Configure and start the frontend

Open a second terminal from the repository root:

```bash
cd shopkart-frontend
npm install
npm run dev
```

Open the local URL shown by Vite, usually `http://localhost:5173`.

## Main API Endpoints

Protected endpoints require authentication through the existing session mechanism.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/customers/register` | Register a customer |
| POST | `/customers/login` | Log in |
| GET | `/customers/me` | Get the current profile |
| POST | `/customers/logout` | Log out |
| POST | `/products` | Create a product |
| GET | `/products` | List, search and filter products |
| GET | `/products/:id` | Get product details |
| POST | `/wishlist/:productId` | Add to wishlist |
| GET | `/wishlist` | Retrieve wishlist |
| DELETE | `/wishlist/:productId` | Remove from wishlist |
| POST | `/cart/:productId` | Add to cart or increase quantity |
| GET | `/cart` | Retrieve cart |
| PATCH | `/cart/:productId` | Update cart quantity |
| DELETE | `/cart/:productId` | Remove from cart |
| POST | `/orders/create-payment-order` | Validate cart and create a payment order |
| POST | `/orders/verify-payment` | Verify payment and confirm the order |
| GET | `/orders` | Retrieve order history |
| GET | `/orders/:id` | Retrieve an individual order |

## Testing

Run the backend regression and Lab 06 test suite from `shopkart-backend/`:

```bash
npm test
```

Run frontend checks from `shopkart-frontend/`:

```bash
npm run lint
npm run build
```

**Note:** The backend tests may connect to MongoDB and modify test records. Use a dedicated development/test database and inspect the test script before running it against data you need to preserve.

## Security Notes

- Use Razorpay **Test Mode** credentials only.
- Keep `.env` files private and never commit them to GitHub.
- Never expose `RAZORPAY_KEY_SECRET` in frontend code or API responses.
- Order totals are calculated by the backend using current product prices and cart quantities.
- Payment signatures are verified on the backend before an order is marked as paid and the cart is cleared.
- Orders retain purchase-time snapshots of product information and prices.

ShopKart is an educational project. Additional security, operational, and payment-provider requirements should be reviewed before using it for real customers.