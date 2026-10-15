import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../services/api";
import { CartContext } from "./CartContext";

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pendingItemMap, setPendingItemMap] = useState({});

    // Manual/Retry fetchCart handler
    const fetchCart = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get("/cart");
            setCartItems(response.data.cart || []);
        } catch (err) {
            if (err.response?.status === 401) {
                setCartItems([]);
                setError(null);
            } else {
                setError(err.response?.data?.message || "Unable to load your cart.");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load on mount without cascading synchronous setState
    useEffect(() => {
        let isMounted = true;

        async function initialLoad() {
            try {
                const response = await api.get("/cart");
                if (isMounted) {
                    setCartItems(response.data.cart || []);
                }
            } catch (err) {
                if (!isMounted) return;
                if (err.response?.status === 401) {
                    setCartItems([]);
                    setError(null);
                } else {
                    setError(err.response?.data?.message || "Unable to load your cart.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        initialLoad();

        return () => {
            isMounted = false;
        };
    }, []);

    // Add product to cart (or increment existing quantity)
    const addToCart = useCallback(async (productId) => {
        setPendingItemMap((prev) => ({ ...prev, [productId]: "adding" }));
        try {
            const response = await api.post(`/cart/${productId}`);
            if (response.data.cart) {
                setCartItems(response.data.cart);
            } else {
                await fetchCart();
            }
            return {
                success: true,
                message: response.data.message || "Added to cart"
            };
        } catch (err) {
            const status = err.response?.status;
            const message = err.response?.data?.message || "Failed to add to cart";
            return {
                success: false,
                status,
                message
            };
        } finally {
            setPendingItemMap((prev) => {
                const next = { ...prev };
                delete next[productId];
                return next;
            });
        }
    }, [fetchCart]);

    // Update item quantity
    const updateQuantity = useCallback(async (productId, quantity) => {
        if (quantity < 1) {
            return {
                success: false,
                message: "Quantity cannot be less than 1"
            };
        }

        setPendingItemMap((prev) => ({ ...prev, [productId]: "updating" }));
        try {
            const response = await api.patch(`/cart/${productId}`, { quantity });
            if (response.data.cart) {
                setCartItems(response.data.cart);
            } else {
                await fetchCart();
            }
            return {
                success: true,
                message: response.data.message || "Cart updated"
            };
        } catch (err) {
            const message = err.response?.data?.message || "Failed to update quantity";
            return {
                success: false,
                message
            };
        } finally {
            setPendingItemMap((prev) => {
                const next = { ...prev };
                delete next[productId];
                return next;
            });
        }
    }, [fetchCart]);

    // Remove product from cart
    const removeFromCart = useCallback(async (productId) => {
        setPendingItemMap((prev) => ({ ...prev, [productId]: "removing" }));
        try {
            const response = await api.delete(`/cart/${productId}`);
            if (response.data.cart) {
                setCartItems(response.data.cart);
            } else {
                await fetchCart();
            }
            return {
                success: true,
                message: response.data.message || "Removed from cart"
            };
        } catch (err) {
            const message = err.response?.data?.message || "Failed to remove item";
            return {
                success: false,
                message
            };
        } finally {
            setPendingItemMap((prev) => {
                const next = { ...prev };
                delete next[productId];
                return next;
            });
        }
    }, [fetchCart]);

    // Clear cart on logout
    const clearCart = useCallback(() => {
        setCartItems([]);
        setError(null);
    }, []);

    // Derived values
    const totalItems = useMemo(() => {
        return cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
    }, [cartItems]);

    const subtotal = useMemo(() => {
        return cartItems.reduce((acc, item) => {
            const price = Number(item.product?.price) || 0;
            const qty = Number(item.quantity) || 0;
            return acc + price * qty;
        }, 0);
    }, [cartItems]);

    const isItemInCart = useCallback((productId) => {
        return cartItems.some((item) => item.product?._id === productId);
    }, [cartItems]);

    const getItemQuantity = useCallback((productId) => {
        const item = cartItems.find((item) => item.product?._id === productId);
        return item ? item.quantity : 0;
    }, [cartItems]);

    const value = {
        cartItems,
        loading,
        error,
        pendingItemMap,
        totalItems,
        subtotal,
        addToCart,
        updateQuantity,
        removeFromCart,
        fetchCart,
        clearCart,
        isItemInCart,
        getItemQuantity
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}
