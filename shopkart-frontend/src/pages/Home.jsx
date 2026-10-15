import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";
import Navbar from "../components/Navbar";

function Home() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get("/customers/me");

                setUser(response.data);
            } catch (error) {
                console.error("Failed to fetch profile:", error);

                if (error.response?.status === 401) {
                    navigate("/login");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    if (loading) {
        return (
            <div className="loading-screen">
                Loading...
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="home-page">
            <Navbar />

            <main className="home-content">
                <section className="welcome-section">
                    <p className="welcome-label">
                        Welcome back
                    </p>

                    <h1>
                        Hello, {user.fullName} 👋
                    </h1>

                    <p className="welcome-text">
                        Here's your ShopKart account information.
                    </p>
                </section>

                <section className="profile-card">
                    <h2>My Profile</h2>

                    <div className="profile-item">
                        <span>Name</span>
                        <strong>{user.fullName}</strong>
                    </div>

                    <div className="profile-item">
                        <span>Email</span>
                        <strong>{user.email}</strong>
                    </div>

                    <div className="profile-item">
                        <span>Phone</span>
                        <strong>{user.phone}</strong>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default Home;