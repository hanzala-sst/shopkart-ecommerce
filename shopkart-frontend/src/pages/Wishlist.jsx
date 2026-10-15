import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../services/api";
import Navbar from "../components/Navbar";
import WishlistCard from "../components/WishlistCard";

function Wishlist() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function loadWishlist() {
            setLoading(true);
            setError("");

            try {
                const response = await api.get("/wishlist");

                if (!cancelled) {
                    setItems(response.data.wishlist || []);
                }
            } catch (err) {
                if (cancelled) {
                    return;
                }

                if (err.response?.status === 401) {
                    navigate("/login");
                    return;
                }

                setError(
                    err.response?.data?.message ||
                    "We couldn't load your wishlist."
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadWishlist();

        return () => {
            cancelled = true;
        };
    }, [navigate, reloadKey]);

    const loadWishlist = () => {
        setReloadKey((key) => key + 1);
    };

    const handleRemoved = (productId) => {
        setItems((current) =>
            current.filter((product) => product._id !== productId)
        );
    };

    return (
        <div className="app-shell">
            <Navbar />

            <main className="wishlist-page">
                <header className="page-header">
                    <p className="eyebrow">Saved for later</p>
                    <h1>My Wishlist</h1>
                    {!loading && !error ? (
                        <p className="page-subtitle">
                            {items.length} product
                            {items.length === 1 ? "" : "s"} saved
                        </p>
                    ) : null}
                </header>

                {loading ? (
                    <p className="status-panel" aria-live="polite">
                        Loading your wishlist...
                    </p>
                ) : error ? (
                    <div className="status-panel status-panel-error">
                        <p>Something went wrong.</p>
                        <p>{error}</p>
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={loadWishlist}
                        >
                            Try Again
                        </button>
                    </div>
                ) : items.length === 0 ? (
                    <div className="status-panel status-panel-empty">
                        <span className="empty-icon" aria-hidden="true">
                            ❤️
                        </span>
                        <h2>Your wishlist is empty</h2>
                        <p>
                            Save products you love and find them here later.
                        </p>
                        <Link to="/products" className="primary-button inline">
                            Browse Products
                        </Link>
                    </div>
                ) : (
                    <div className="wishlist-grid">
                        {items.map((product) => (
                            <WishlistCard
                                key={product._id}
                                product={product}
                                onRemoved={handleRemoved}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default Wishlist;
