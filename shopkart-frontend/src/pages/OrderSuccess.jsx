import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function OrderSuccess() {
    const { id } = useParams();
    const location = useLocation();

    // Check if order was passed via router state
    const [order, setOrder] = useState(location.state?.order || null);
    const [loading, setLoading] = useState(!location.state?.order);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        if (!order && id) {
            const fetchOrder = async () => {
                setLoading(true);
                setError(null);
                try {
                    const response = await api.get(`/orders/${id}`);
                    if (isMounted) {
                        setOrder(response.data.order);
                    }
                } catch (err) {
                    if (isMounted) {
                        setError(
                            err.response?.data?.message ||
                            "Unable to retrieve order details."
                        );
                    }
                } finally {
                    if (isMounted) {
                        setLoading(false);
                    }
                }
            };

            fetchOrder();
        }

        return () => {
            isMounted = false;
        };
    }, [id, order]);

    return (
        <div className="app-shell">
            <Navbar />

            <main className="order-success-page">
                {loading ? (
                    <div className="status-panel" aria-live="polite">
                        <p className="status-loading-text">Loading order confirmation...</p>
                    </div>
                ) : error ? (
                    <div className="status-panel status-panel-error" role="alert">
                        <h2>Order Not Found</h2>
                        <p>{error}</p>
                        <Link to="/orders" className="primary-button inline">
                            Go to My Orders
                        </Link>
                    </div>
                ) : order ? (
                    <div className="success-container">
                        <div className="success-header-card">
                            <div className="success-badge-icon" aria-hidden="true">
                                ✓
                            </div>
                            <span className="success-kicker">Payment Verified</span>
                            <h1>Order Placed Successfully!</h1>
                            <p className="success-subtitle">
                                Thank you for your purchase. Your order has been recorded and is being prepared.
                            </p>

                            <div className="order-reference-bar">
                                <div className="ref-item">
                                    <span className="ref-label">Order ID</span>
                                    <span className="ref-value font-mono">{order._id}</span>
                                </div>
                                <div className="ref-item">
                                    <span className="ref-label">Payment Status</span>
                                    <span className="badge badge-paid">{order.paymentStatus}</span>
                                </div>
                                <div className="ref-item">
                                    <span className="ref-label">Order Status</span>
                                    <span className="badge badge-placed">{order.status}</span>
                                </div>
                                {order.razorpayPaymentId ? (
                                    <div className="ref-item">
                                        <span className="ref-label">Transaction ID</span>
                                        <span className="ref-value font-mono">{order.razorpayPaymentId}</span>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="success-details-grid">
                            {/* Items snapshot */}
                            <section className="success-items-card" aria-label="Purchased Items">
                                <h2>Items in this Order ({order.items?.length || 0})</h2>
                                <div className="snapshot-items-list">
                                    {order.items?.map((item, index) => (
                                        <div key={item._id || index} className="snapshot-item-row">
                                            {item.image ? (
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="snapshot-item-img"
                                                    onError={(e) => {
                                                        e.target.style.display = "none";
                                                    }}
                                                />
                                            ) : (
                                                <div className="snapshot-img-placeholder">📦</div>
                                            )}
                                            <div className="snapshot-item-meta">
                                                <h3>{item.name}</h3>
                                                <p className="item-qty-price">
                                                    Qty: {item.quantity} × ₹{Number(item.price).toLocaleString("en-IN")}
                                                </p>
                                            </div>
                                            <div className="snapshot-item-total">
                                                ₹{(Number(item.price) * item.quantity).toLocaleString("en-IN")}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="snapshot-total-footer">
                                    <div className="total-row">
                                        <span>Total Amount Paid</span>
                                        <span className="total-highlight">
                                            ₹{Number(order.totalAmount).toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                </div>
                            </section>

                            {/* Shipping address */}
                            <aside className="success-address-card" aria-label="Delivery Details">
                                <h2>Delivery Address</h2>
                                {order.shippingAddress ? (
                                    <div className="address-display">
                                        <p className="recipient-name">
                                            <strong>{order.shippingAddress.fullName}</strong>
                                        </p>
                                        <p className="recipient-line">{order.shippingAddress.addressLine1}</p>
                                        <p className="recipient-line">
                                            {order.shippingAddress.city}, {order.shippingAddress.state} -{" "}
                                            <strong>{order.shippingAddress.pincode}</strong>
                                        </p>
                                        <p className="recipient-phone">
                                            📞 {order.shippingAddress.phone}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-muted">No shipping address recorded.</p>
                                )}

                                <div className="success-actions">
                                    <Link to="/orders" className="primary-button full-width">
                                        View My Orders
                                    </Link>
                                    <Link to="/products" className="secondary-button full-width">
                                        Continue Shopping
                                    </Link>
                                </div>
                            </aside>
                        </div>
                    </div>
                ) : null}
            </main>
        </div>
    );
}

export default OrderSuccess;
