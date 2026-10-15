import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function Orders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedOrderId, setExpandedOrderId] = useState(null);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get("/orders");
            setOrders(response.data.orders || []);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load your orders. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                const response = await api.get("/orders");
                if (isMounted) {
                    setOrders(response.data.orders || []);
                }
            } catch (err) {
                if (isMounted) {
                    setError(
                        err.response?.data?.message ||
                        "Unable to load your orders. Please try again."
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        load();

        return () => {
            isMounted = false;
        };
    }, []);

    const toggleExpand = (id) => {
        setExpandedOrderId((prev) => (prev === id ? null : id));
    };

    const formatDate = (isoString) => {
        if (!isoString) return "N/A";
        const date = new Date(isoString);
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case "PLACED":
                return "badge badge-placed";
            case "CONFIRMED":
                return "badge badge-confirmed";
            case "SHIPPED":
                return "badge badge-shipped";
            case "DELIVERED":
                return "badge badge-delivered";
            default:
                return "badge badge-pending";
        }
    };

    return (
        <div className="app-shell">
            <Navbar />

            <main className="orders-page">
                <header className="page-header">
                    <p className="eyebrow">Purchase History</p>
                    <h1>My Orders</h1>
                    {!loading && !error && orders.length > 0 ? (
                        <p className="page-subtitle">
                            You have placed {orders.length} order{orders.length === 1 ? "" : "s"}.
                        </p>
                    ) : null}
                </header>

                {loading ? (
                    <div className="status-panel" aria-live="polite">
                        <p className="status-loading-text">Loading your orders...</p>
                    </div>
                ) : error ? (
                    <div className="status-panel status-panel-error" role="alert">
                        <h2>Unable to load your orders</h2>
                        <p>{error}</p>
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={fetchOrders}
                        >
                            Try Again
                        </button>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="status-panel status-panel-empty">
                        <span className="empty-icon" aria-hidden="true">
                            📦
                        </span>
                        <h2>You have not placed any orders yet</h2>
                        <p>Browse our catalog and pick something you love!</p>
                        <Link to="/products" className="primary-button inline">
                            Start Shopping
                        </Link>
                    </div>
                ) : (
                    <div className="orders-list">
                        {orders.map((order) => {
                            const isExpanded = expandedOrderId === order._id;
                            const itemCount = order.items?.reduce(
                                (acc, item) => acc + (item.quantity || 1),
                                0
                            ) || 0;

                            return (
                                <article key={order._id} className="order-card">
                                    <header className="order-card-header">
                                        <div className="order-card-meta">
                                            <span className="order-number font-mono">
                                                Order #{order._id}
                                            </span>
                                            <span className="order-date">
                                                Placed on {formatDate(order.createdAt)}
                                            </span>
                                        </div>

                                        <div className="order-card-badges">
                                            <span
                                                className={`badge ${
                                                    order.paymentStatus === "PAID"
                                                        ? "badge-paid"
                                                        : order.paymentStatus === "FAILED"
                                                        ? "badge-failed"
                                                        : "badge-pending"
                                                }`}
                                            >
                                                Payment: {order.paymentStatus}
                                            </span>
                                            <span className={getStatusBadgeClass(order.status)}>
                                                {order.status}
                                            </span>
                                        </div>
                                    </header>

                                    <div className="order-card-summary-row">
                                        <div className="summary-col">
                                            <span className="col-label">Total Amount</span>
                                            <span className="col-val price-text">
                                                ₹{Number(order.totalAmount).toLocaleString("en-IN")}
                                            </span>
                                        </div>

                                        <div className="summary-col">
                                            <span className="col-label">Items</span>
                                            <span className="col-val">
                                                {order.items?.length || 0} product(s) ({itemCount} units)
                                            </span>
                                        </div>

                                        <div className="summary-col">
                                            <span className="col-label">Delivery To</span>
                                            <span className="col-val">
                                                {order.shippingAddress?.fullName || "Recipient"} (
                                                {order.shippingAddress?.city || "City"})
                                            </span>
                                        </div>

                                        <div className="summary-col action-col">
                                            <button
                                                type="button"
                                                className="secondary-button order-details-toggle"
                                                onClick={() => toggleExpand(order._id)}
                                                aria-expanded={isExpanded}
                                            >
                                                {isExpanded ? "Hide Details ▲" : "View Details ▼"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Collapsible Details */}
                                    {isExpanded ? (
                                        <div className="order-card-expanded">
                                            <div className="expanded-section">
                                                <h4>Items Snapshot</h4>
                                                <div className="order-items-table">
                                                    {order.items?.map((item, idx) => (
                                                        <div
                                                            key={item._id || idx}
                                                            className="order-item-detail-row"
                                                        >
                                                            {item.image ? (
                                                                <img
                                                                    src={item.image}
                                                                    alt={item.name}
                                                                    className="order-item-thumb"
                                                                    onError={(e) => {
                                                                        e.target.style.display = "none";
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="order-item-thumb-placeholder">
                                                                    📦
                                                                </div>
                                                            )}
                                                            <div className="order-item-info">
                                                                <p className="order-item-title">
                                                                    {item.name}
                                                                </p>
                                                                <p className="order-item-pricing">
                                                                    Qty: {item.quantity} × ₹
                                                                    {Number(item.price).toLocaleString("en-IN")}
                                                                </p>
                                                            </div>
                                                            <div className="order-item-line-total">
                                                                ₹
                                                                {(
                                                                    Number(item.price) * item.quantity
                                                                ).toLocaleString("en-IN")}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="expanded-details-grid">
                                                <div className="expanded-box">
                                                    <h4>Shipping Address</h4>
                                                    <p>
                                                        <strong>{order.shippingAddress?.fullName}</strong>
                                                    </p>
                                                    <p>{order.shippingAddress?.addressLine1}</p>
                                                    <p>
                                                        {order.shippingAddress?.city},{" "}
                                                        {order.shippingAddress?.state} -{" "}
                                                        {order.shippingAddress?.pincode}
                                                    </p>
                                                    <p>📞 {order.shippingAddress?.phone}</p>
                                                </div>

                                                <div className="expanded-box">
                                                    <h4>Payment Information</h4>
                                                    <p>
                                                        <strong>Mode:</strong> Razorpay Test Mode
                                                    </p>
                                                    {order.razorpayOrderId ? (
                                                        <p className="font-mono text-sm">
                                                            <strong>Order ID:</strong> {order.razorpayOrderId}
                                                        </p>
                                                    ) : null}
                                                    {order.razorpayPaymentId ? (
                                                        <p className="font-mono text-sm">
                                                            <strong>Payment ID:</strong> {order.razorpayPaymentId}
                                                        </p>
                                                    ) : null}
                                                    <p>
                                                        <strong>Status:</strong> {order.paymentStatus}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </article>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}

export default Orders;
