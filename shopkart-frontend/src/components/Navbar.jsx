import { useNavigate, useLocation } from "react-router-dom";

import api from "../services/api";
import { useCart } from "../context/CartContext";

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { totalItems, clearCart } = useCart();

    const handleLogout = async () => {
        try {
            await api.post("/customers/logout");
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            clearCart();
            navigate("/login");
        }
    };

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <button
                    className="brand"
                    onClick={() => navigate("/home")}
                >
                    ShopKart
                </button>

                <div className="navbar-links">
                    <button
                        type="button"
                        className={`nav-link ${isActive("/home") ? "active" : ""}`}
                        onClick={() => navigate("/home")}
                    >
                        Home
                    </button>

                    <button
                        type="button"
                        className={`nav-link ${isActive("/products") ? "active" : ""}`}
                        onClick={() => navigate("/products")}
                    >
                        Products
                    </button>

                    <button
                        type="button"
                        className={`nav-link ${isActive("/wishlist") ? "active" : ""}`}
                        onClick={() => navigate("/wishlist")}
                    >
                        Wishlist
                    </button>

                    <button
                        type="button"
                        className={`nav-link ${isActive("/cart") ? "active" : ""}`}
                        onClick={() => navigate("/cart")}
                    >
                        Cart ({totalItems})
                    </button>

                    <button
                        type="button"
                        className={`nav-link ${isActive("/orders") ? "active" : ""}`}
                        onClick={() => navigate("/orders")}
                    >
                        Orders
                    </button>
                </div>

                <button
                    type="button"
                    className="logout-button"
                    onClick={handleLogout}
                >
                    Logout
                </button>
            </div>
        </nav>
    );
}

export default Navbar;