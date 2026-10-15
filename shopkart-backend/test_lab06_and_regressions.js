/**
 * Comprehensive Automated Regression & Lab 06 Verification Suite
 * Tests Labs 01-05 regressions + Lab 06 Order & Razorpay logic.
 */

const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const crypto = require("crypto");
const mongoose = require("mongoose");
const express = require("express");
const cookieParser = require("cookie-parser");

const customerRoutes = require("./routes/customer.routes");
const productRoutes = require("./routes/product.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/order.routes");

const Customer = require("./models/customer.model");
const Product = require("./models/product.model");
const Order = require("./models/order.model");

// Configure test environment variables if not set
process.env.JWT_SECRET = process.env.JWT_SECRET || "shopkart_super_secret_jwt_key_2026";
const TEST_RAZORPAY_KEY = "rzp_test_sampleKeyId12345";
const TEST_RAZORPAY_SECRET = "sampleKeySecretForHmacTesting9876";

// Setup express test app
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/customers", customerRoutes);
app.use("/products", productRoutes);
app.use("/wishlist", wishlistRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);

let server;
let baseUrl;

const results = [];

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

async function recordTest(name, fn) {
    try {
        await fn();
        results.push({ name, passed: true });
        console.log(`  PASS: ${name}`);
    } catch (err) {
        results.push({ name, passed: false, error: err.message });
        console.error(`  FAIL: ${name} -> ${err.message}`);
    }
}

async function runAllTests() {
    console.log("=================================================");
    console.log("SHOPKART LAB 06 & REGRESSION VERIFICATION SUITE");
    console.log("=================================================\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB Atlas\n");

    // Start server on random available port
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const uniqueSuffix = Date.now();
    const testEmailA = `test_cust_a_${uniqueSuffix}@example.com`;
    const testEmailB = `test_cust_b_${uniqueSuffix}@example.com`;
    const testPassword = "Password@123";

    let tokenA = "";
    let tokenB = "";
    let customerAId = "";
    let customerBId = "";
    let sampleProduct = null;
    let shopKartOrderId = "";
    let mockRazorpayOrderId = `order_test_${uniqueSuffix}`;
    let mockRazorpayPaymentId = `pay_test_${uniqueSuffix}`;

    try {
        // --- SECTION 1: LABS 01-02 REGRESSION (AUTH) ---
        console.log("--- 1. Testing Labs 01-02 Authentication Regressions ---");

        await recordTest("Register Customer A", async () => {
            const res = await fetch(`${baseUrl}/customers/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName: "Customer A",
                    email: testEmailA,
                    password: testPassword,
                    phone: "9876543210"
                })
            });
            const data = await res.json();
            assert(res.status === 201 || res.status === 200, `Expected 200/201, got ${res.status}`);
            assert(data.success, "Registration response was not success");
        });

        await recordTest("Login Customer A and retrieve JWT cookie/token", async () => {
            const res = await fetch(`${baseUrl}/customers/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: testEmailA,
                    password: testPassword
                })
            });
            const data = await res.json();
            assert(res.status === 200, `Login status was ${res.status}`);
            const setCookie = res.headers.get("set-cookie") || "";
            const match = setCookie.match(/token=([^;]+)/);
            tokenA = match ? match[1] : data.token;
            assert(tokenA, "Login did not set token cookie");
            customerAId = data.customer?._id || data.customerId;
        });

        await recordTest("Register and Login Customer B (for isolation testing)", async () => {
            await fetch(`${baseUrl}/customers/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName: "Customer B",
                    email: testEmailB,
                    password: testPassword,
                    phone: "9876543211"
                })
            });
            const res = await fetch(`${baseUrl}/customers/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: testEmailB,
                    password: testPassword
                })
            });
            const data = await res.json();
            const setCookie = res.headers.get("set-cookie") || "";
            const match = setCookie.match(/token=([^;]+)/);
            tokenB = match ? match[1] : data.token;
            customerBId = data.customer?._id || data.customerId;
            assert(tokenB, "Token B cookie missing");
        });

        await recordTest("GET /customers/me retrieves authenticated customer", async () => {
            const res = await fetch(`${baseUrl}/customers/me`, {
                headers: { Authorization: `Bearer ${tokenA}` }
            });
            const data = await res.json();
            assert(res.status === 200, `Status: ${res.status}`);
            assert(data.email === testEmailA || data.customer?.email === testEmailA, "Customer email mismatch");
        });

        // --- SECTION 2: LAB 03 REGRESSION (PRODUCTS) ---
        console.log("\n--- 2. Testing Lab 03 Product Catalogue Regressions ---");

        await recordTest("GET /products lists catalogue items", async () => {
            const res = await fetch(`${baseUrl}/products`);
            const data = await res.json();
            assert(res.status === 200, `Status: ${res.status}`);
            assert(Array.isArray(data.products) && data.products.length > 0, "No products found");
            sampleProduct = data.products.find((p) => p.stock > 2) || data.products[0];
            assert(sampleProduct, "No valid sample product available");
        });

        await recordTest("GET /products/:id returns single product details", async () => {
            const res = await fetch(`${baseUrl}/products/${sampleProduct._id}`);
            const data = await res.json();
            assert(res.status === 200, `Status: ${res.status}`);
            assert(data.product?._id === sampleProduct._id.toString(), "Product ID mismatch");
        });

        // --- SECTION 3: LAB 04 REGRESSION (WISHLIST) ---
        console.log("\n--- 3. Testing Lab 04 Wishlist Regressions ---");

        await recordTest("POST /wishlist/:productId adds item to wishlist", async () => {
            const res = await fetch(`${baseUrl}/wishlist/${sampleProduct._id}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${tokenA}` }
            });
            assert(res.status === 200 || res.status === 201, `Status: ${res.status}`);
        });

        await recordTest("GET /wishlist retrieves populated items", async () => {
            const res = await fetch(`${baseUrl}/wishlist`, {
                headers: { Authorization: `Bearer ${tokenA}` }
            });
            const data = await res.json();
            assert(res.status === 200, `Status: ${res.status}`);
            assert(data.wishlist?.length > 0, "Wishlist should contain items");
        });

        // --- SECTION 4: LAB 05 REGRESSION (CART) ---
        console.log("\n--- 4. Testing Lab 05 Cart Regressions ---");

        await recordTest("POST /cart/:productId adds item with stock validation", async () => {
            const res = await fetch(`${baseUrl}/cart/${sampleProduct._id}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${tokenA}` }
            });
            const data = await res.json();
            assert(res.status === 200, `Status: ${res.status}`);
            assert(data.cart?.length > 0, "Cart should have items");
        });

        await recordTest("PATCH /cart/:productId updates quantity", async () => {
            const res = await fetch(`${baseUrl}/cart/${sampleProduct._id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenA}`
                },
                body: JSON.stringify({ quantity: 2 })
            });
            const data = await res.json();
            assert(res.status === 200, `Status: ${res.status}`);
            const updated = data.cart.find((i) => (i.product?._id || i.product) === sampleProduct._id.toString());
            assert(updated?.quantity === 2, `Expected quantity 2, got ${updated?.quantity}`);
        });

        await recordTest("GET /cart confirms populated items and isolation for Customer B", async () => {
            const resA = await fetch(`${baseUrl}/cart`, {
                headers: { Authorization: `Bearer ${tokenA}` }
            });
            const dataA = await resA.json();
            assert(dataA.cart?.length === 1, "Customer A should have 1 cart item");

            const resB = await fetch(`${baseUrl}/cart`, {
                headers: { Authorization: `Bearer ${tokenB}` }
            });
            const dataB = await resB.json();
            assert(dataB.cart?.length === 0, "Customer B cart must be empty (isolation)");
        });

        // --- SECTION 5: LAB 06 ORDER & CHECKOUT & RAZORPAY TESTS ---
        console.log("\n--- 5. Testing Lab 06 Order & Razorpay Tests ---");

        await recordTest("Unauthenticated requests to order endpoints are rejected with 401", async () => {
            const r1 = await fetch(`${baseUrl}/orders/create-payment-order`, { method: "POST" });
            assert(r1.status === 401, `create-payment-order unauthenticated status: ${r1.status}`);

            const r2 = await fetch(`${baseUrl}/orders/verify-payment`, { method: "POST" });
            assert(r2.status === 401, `verify-payment unauthenticated status: ${r2.status}`);

            const r3 = await fetch(`${baseUrl}/orders`);
            assert(r3.status === 401, `get orders unauthenticated status: ${r3.status}`);

            const r4 = await fetch(`${baseUrl}/orders/64b1f2e3d4c5b6a789012345`);
            assert(r4.status === 401, `get order by id unauthenticated status: ${r4.status}`);
        });

        await recordTest("Reject order creation for empty cart (Customer B)", async () => {
            const res = await fetch(`${baseUrl}/orders/create-payment-order`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenB}`
                },
                body: JSON.stringify({
                    shippingAddress: {
                        fullName: "Customer B",
                        phone: "9876543210",
                        addressLine1: "123 Street",
                        city: "Bengaluru",
                        state: "Karnataka",
                        pincode: "560001"
                    }
                })
            });
            assert(res.status === 400, `Expected 400 for empty cart, got ${res.status}`);
            const data = await res.json();
            assert(data.message.toLowerCase().includes("empty"), "Error message should mention empty cart");
        });

        await recordTest("Reject order creation with missing or whitespace-only shipping details", async () => {
            const invalidAddresses = [
                { fullName: "   ", phone: "9876543210", addressLine1: "Road", city: "City", state: "State", pincode: "560001" },
                { fullName: "Aarav", phone: "123", addressLine1: "Road", city: "City", state: "State", pincode: "560001" }, // bad phone
                { fullName: "Aarav", phone: "9876543210", addressLine1: "Road", city: "City", state: "State", pincode: "560" } // bad pincode
            ];

            for (const addr of invalidAddresses) {
                const res = await fetch(`${baseUrl}/orders/create-payment-order`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${tokenA}`
                    },
                    body: JSON.stringify({ shippingAddress: addr })
                });
                assert(res.status === 400, `Expected 400 for invalid address, got ${res.status}`);
            }
        });

        await recordTest("Stock re-validation: reject if item quantity exceeds available stock", async () => {
            // Temporarily set product stock to 1 while customer cart has quantity 2
            const originalStock = sampleProduct.stock;
            await Product.findByIdAndUpdate(sampleProduct._id, { stock: 1 });

            const res = await fetch(`${baseUrl}/orders/create-payment-order`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenA}`
                },
                body: JSON.stringify({
                    shippingAddress: {
                        fullName: "Aarav Sharma",
                        phone: "9876543210",
                        addressLine1: "42 MG Road",
                        city: "Bengaluru",
                        state: "Karnataka",
                        pincode: "560001"
                    }
                })
            });

            // Restore stock
            await Product.findByIdAndUpdate(sampleProduct._id, { stock: originalStock });

            assert(res.status === 400, `Expected 400 for insufficient stock, got ${res.status}`);
            const data = await res.json();
            assert(data.message.toLowerCase().includes("stock"), "Message should mention stock limitation");
        });

        await recordTest("Ignore fake frontend totalAmount and calculate authoritative total on server", async () => {
            // Set test keys temporarily in process.env so Razorpay SDK initializes cleanly for the test
            process.env.RAZORPAY_KEY_ID = TEST_RAZORPAY_KEY;
            process.env.RAZORPAY_KEY_SECRET = TEST_RAZORPAY_SECRET;

            // Mock razorpay.orders.create if Razorpay API keys are mock keys
            const razorpayConfig = require("./config/razorpay");
            const originalGetInstance = razorpayConfig.getRazorpayInstance;
            razorpayConfig.getRazorpayInstance = () => ({
                orders: {
                    create: async ({ amount, currency, receipt }) => {
                        return {
                            id: mockRazorpayOrderId,
                            amount,
                            currency,
                            receipt,
                            status: "created"
                        };
                    }
                }
            });

            // Try to submit fake totalAmount = 1
            const res = await fetch(`${baseUrl}/orders/create-payment-order`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenA}`
                },
                body: JSON.stringify({
                    shippingAddress: {
                        fullName: "Aarav Sharma",
                        phone: "9876543210",
                        addressLine1: "42 MG Road",
                        city: "Bengaluru",
                        state: "Karnataka",
                        pincode: "560001"
                    },
                    totalAmount: 1 // FAKE TOTAL
                })
            });

            const data = await res.json();
            assert(res.status === 201, `Expected 201, got ${res.status}: ${data.message}`);
            assert(data.shopKartOrderId, "Missing shopKartOrderId");
            assert(data.razorpayOrderId === mockRazorpayOrderId, "Razorpay order ID mismatch");
            assert(data.key === TEST_RAZORPAY_KEY, "Public Key ID should be returned");
            assert(!data.secret && !data.key_secret, "Secret must NEVER be returned in response");

            shopKartOrderId = data.shopKartOrderId;

            // Check persisted ShopKart order
            const orderDoc = await Order.findById(shopKartOrderId);
            assert(orderDoc, "Order document not found");
            const expectedTotal = sampleProduct.price * 2;
            assert(orderDoc.totalAmount === expectedTotal, `Expected total ${expectedTotal}, got ${orderDoc.totalAmount}`);
            assert(orderDoc.status === "PENDING_PAYMENT", "Status should be PENDING_PAYMENT");
            assert(orderDoc.paymentStatus === "PENDING", "Payment status should be PENDING");

            // Verify paise conversion: amount = total * 100
            assert(data.amount === Math.round(expectedTotal * 100), `Expected ${expectedTotal * 100} paise, got ${data.amount}`);

            // Restore getRazorpayInstance
            razorpayConfig.getRazorpayInstance = originalGetInstance;
        });

        await recordTest("GET /cart remains populated BEFORE payment verification", async () => {
            const res = await fetch(`${baseUrl}/cart`, {
                headers: { Authorization: `Bearer ${tokenA}` }
            });
            const data = await res.json();
            assert(res.status === 200, `Status: ${res.status}`);
            assert(data.cart?.length > 0, "Cart must NOT be cleared before payment verification");
        });

        await recordTest("POST /orders/verify-payment with invalid signature is rejected and does not clear cart", async () => {
            const res = await fetch(`${baseUrl}/orders/verify-payment`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenA}`
                },
                body: JSON.stringify({
                    shopKartOrderId,
                    razorpay_order_id: mockRazorpayOrderId,
                    razorpay_payment_id: mockRazorpayPaymentId,
                    razorpay_signature: "fake_forged_invalid_signature_12345"
                })
            });

            assert(res.status === 400, `Expected 400 for invalid signature, got ${res.status}`);

            // Check order was NOT marked paid
            const orderDoc = await Order.findById(shopKartOrderId);
            assert(orderDoc.paymentStatus !== "PAID", "Order must NOT be marked PAID");

            // Check customer cart is STILL NOT cleared
            const cartRes = await fetch(`${baseUrl}/cart`, {
                headers: { Authorization: `Bearer ${tokenA}` }
            });
            const cartData = await cartRes.json();
            assert(cartData.cart?.length > 0, "Cart must remain intact after failed verification");
        });

        await recordTest("POST /orders/verify-payment with valid HMAC-SHA256 signature marks order PAID and clears cart", async () => {
            // Generate authentic HMAC-SHA256 signature according to Razorpay specification
            const body = `${mockRazorpayOrderId}|${mockRazorpayPaymentId}`;
            const validSignature = crypto
                .createHmac("sha256", TEST_RAZORPAY_SECRET)
                .update(body)
                .digest("hex");

            const res = await fetch(`${baseUrl}/orders/verify-payment`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenA}`
                },
                body: JSON.stringify({
                    shopKartOrderId,
                    razorpay_order_id: mockRazorpayOrderId,
                    razorpay_payment_id: mockRazorpayPaymentId,
                    razorpay_signature: validSignature
                })
            });

            const data = await res.json();
            assert(res.status === 200, `Expected 200, got ${res.status}: ${data.message}`);
            assert(data.order?.paymentStatus === "PAID", "Order paymentStatus must be PAID");
            assert(data.order?.status === "PLACED", "Order status must be PLACED");
            assert(data.order?.razorpayPaymentId === mockRazorpayPaymentId, "Payment ID mismatch");

            // Verify MongoDB cart is now cleared
            const cartRes = await fetch(`${baseUrl}/cart`, {
                headers: { Authorization: `Bearer ${tokenA}` }
            });
            const cartData = await cartRes.json();
            assert(cartData.cart?.length === 0, "Cart MUST be cleared after successful payment verification");
        });

        await recordTest("Purchase snapshot resilience: subsequent Product price change does not alter order snapshot", async () => {
            const originalPrice = sampleProduct.price;
            const updatedPrice = originalPrice + 500;

            // Change product price in catalog
            await Product.findByIdAndUpdate(sampleProduct._id, { price: updatedPrice });

            // Fetch the persisted order
            const orderDoc = await Order.findById(shopKartOrderId);
            const itemSnapshot = orderDoc.items.find((i) => i.product.toString() === sampleProduct._id.toString());

            // Snapshot price must remain the historical purchase price!
            assert(itemSnapshot.price === originalPrice, `Snapshot price ${itemSnapshot.price} should equal original price ${originalPrice}`);

            // Restore catalog price
            await Product.findByIdAndUpdate(sampleProduct._id, { price: originalPrice });
        });

        await recordTest("GET /orders returns authenticated customer's orders (newest first)", async () => {
            const res = await fetch(`${baseUrl}/orders`, {
                headers: { Authorization: `Bearer ${tokenA}` }
            });
            const data = await res.json();
            assert(res.status === 200, `Status: ${res.status}`);
            assert(data.orders?.length > 0, "Should return at least 1 order");
            assert(data.orders[0]._id === shopKartOrderId, "Newest order should be first");
        });

        await recordTest("GET /orders/:id ownership enforcement: Customer B cannot access Customer A's order", async () => {
            const res = await fetch(`${baseUrl}/orders/${shopKartOrderId}`, {
                headers: { Authorization: `Bearer ${tokenB}` }
            });
            assert(res.status === 403, `Expected 403 Forbidden for other user's order, got ${res.status}`);
        });

        await recordTest("GET /orders/:id succeeds for order owner", async () => {
            const res = await fetch(`${baseUrl}/orders/${shopKartOrderId}`, {
                headers: { Authorization: `Bearer ${tokenA}` }
            });
            const data = await res.json();
            assert(res.status === 200, `Status: ${res.status}`);
            assert(data.order?._id === shopKartOrderId, "Order ID mismatch");
            assert(data.order?.shippingAddress?.city === "Bengaluru", "Shipping address mismatch");
        });

        await recordTest("PATCH /orders/:id/status updates status progression (Bonus Challenge)", async () => {
            const res = await fetch(`${baseUrl}/orders/${shopKartOrderId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenA}`
                },
                body: JSON.stringify({ status: "CONFIRMED" })
            });
            const data = await res.json();
            assert(res.status === 200, `Status: ${res.status}`);
            assert(data.order?.status === "CONFIRMED", "Order status should be CONFIRMED");
        });

    } finally {
        // Cleanup test users and test orders to preserve database integrity
        console.log("\n--- Cleaning up test artifacts ---");
        await Customer.deleteMany({ email: { $in: [testEmailA, testEmailB] } });
        if (shopKartOrderId) {
            await Order.findByIdAndDelete(shopKartOrderId);
        }
        console.log("Cleanup complete.");

        if (server) {
            server.close();
        }
        await mongoose.disconnect();
    }

    console.log("\n=================================================");
    console.log("TEST SUMMARY REPORT");
    console.log("=================================================");
    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.filter((r) => !r.passed).length;
    console.log(`TOTAL: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);

    if (failedCount > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runAllTests().catch((err) => {
    console.error("FATAL SUITE ERROR:", err);
    process.exit(1);
});
