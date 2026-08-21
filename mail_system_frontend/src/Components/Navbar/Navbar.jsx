import React, { useState, useEffect } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";

// Icon imports
import { BiLogOut, BiLogIn } from "react-icons/bi";
import { GiHamburgerMenu } from "react-icons/gi";
import { RxCross1 } from "react-icons/rx";
import { FiUser } from "react-icons/fi";
import {
    FaHome,
    FaPaperPlane,
    FaAddressBook,
    FaUserShield,
    FaFileAlt
} from "react-icons/fa";

import logo from "../../assets/logo.png";
import "./Navbar.scss";

const Navbar = ({
    children,
    onNavigation,
    isCollapsed = false,
    onToggleCollapse
}) => {
    const [toggle, setToggle] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userPermissions, setUserPermissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    // Sync with parent's collapsed state
    useEffect(() => {
        setToggle(isCollapsed);
    }, [isCollapsed]);

    const handleToggle = (newToggleState) => {
        setToggle(newToggleState);
        if (onToggleCollapse) {
            onToggleCollapse(newToggleState);
        }
    };

    const handleHamburgerClick = () => {
        handleToggle(!toggle);
    };

    const handleCrossClick = () => {
        handleToggle(true);
    };

    const handleMenuIconHiddenClick = () => {
        handleToggle(false);
    };

    // ✅ CHECK AUTH USING COOKIE
    useEffect(() => {
        const checkAuth = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    const permissions = data.user?.permissions || [];
                    setUserPermissions(permissions);
                    setIsLoggedIn(true);
                } else {
                    setIsLoggedIn(false);
                    setUserPermissions([]);
                }
            } catch (error) {
                console.error("Auth check error:", error);
                setIsLoggedIn(false);
                setUserPermissions([]);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    const handleLogin = () => {
        navigate("/login");
    };

    const handleLogout = async () => {
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
                method: "POST",
                credentials: 'include'
            });
        } catch (error) {
            console.error("Logout error:", error);
        }

        setIsLoggedIn(false);
        setUserPermissions([]);
        navigate("/login");
    };

    const getPageTitle = () => {
        const route = location.pathname;
        if (route === '/') return 'Dashboard';
        if (route === '/admin') return 'Admin - Users';
        if (route === '/templates') return 'Templates';
        if (route === '/campaigns/new') return 'Create Campaign';
        if (route.startsWith('/campaigns/')) return 'Campaign Detail';
        if (route === '/lists') return 'Contact Lists';
        if (route.includes('/import')) return 'Import Contacts';
        if (route.startsWith('/lists/')) return 'List Contacts';
        return '';
    };

    const pageTitle = getPageTitle();

    // ✅ MENU CONFIGURATION — Dashboard, Campaigns, Templates, Contacts, Admin
    const menuConfig = [
        {
            id: 'dashboard',
            icon: <FaHome />,
            title: "Dashboard",
            path: "/",
            permission: null // open to every logged-in user
        },
        {
            id: 'campaigns',
            icon: <FaPaperPlane />,
            title: "Campaigns",
            path: "/campaigns",   // ← now points to the list page
            permission: "admin"
        },
        {
            id: 'templates',
            icon: <FaFileAlt />,
            title: "Templates",
            path: "/templates",
            permission: "admin"
        },
        {
            id: 'contacts',
            icon: <FaAddressBook />,
            title: "Contacts",
            path: "/lists",
            permission: "contacts"
        },
        {
            id: 'admin',
            icon: <FaUserShield />,
            title: "Admin",
            path: "/admin",
            permission: "admin"
        }
    ];

    // ✅ FILTER MENU — Admin sees everything, others see based on permission
    const getFilteredMenu = () => {
        if (userPermissions.includes("admin")) {
            return menuConfig;
        }

        return menuConfig.filter(item => {
            if (item.permission === null) return true; // Dashboard always visible
            return userPermissions.includes(item.permission);
        });
    };

    const filteredMenuData = getFilteredMenu();

    // Render menu item
    const renderMenuItem = (item) => (
        <li key={item.id}>
            <NavLink
                to={item.path}
                className={({ isActive }) => (isActive ? "active" : "")}
                onClick={(e) => {
                    if (onNavigation) {
                        e.preventDefault();
                        onNavigation(item.path);
                    }
                }}
            >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-title">{item.title}</span>
            </NavLink>
        </li>
    );

    // ✅ LOADING SCREEN
    if (isLoading) {
        return (
            <div className="navbar-loading-container">
                <div className="navbar-loading-spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <>
            <div id="sidebar" className={toggle ? "hide" : ""}>
                <div className="logo">
                    <div className="logoBox">
                        {toggle ? (
                            <GiHamburgerMenu
                                className="menuIconHidden"
                                onClick={handleMenuIconHiddenClick}
                            />
                        ) : (
                            <>
                                <img src={logo} alt="Logo" className="sidebar-logo" />
                                <RxCross1
                                    className="menuIconHidden"
                                    onClick={handleCrossClick}
                                />
                            </>
                        )}
                    </div>
                </div>

                <ul className="side-menu top">
                    {filteredMenuData.map(item => renderMenuItem(item))}

                    {isLoggedIn && (
                        <li className="logout-menu-item">
                            <button className="sidebar-logout-btn" onClick={handleLogout}>
                                <BiLogOut />
                                <span>Logout</span>
                            </button>
                        </li>
                    )}
                </ul>
            </div>

            <div id="content">
                <nav>
                    <div className="nav-main">
                        <GiHamburgerMenu
                            className="menuIcon"
                            onClick={handleHamburgerClick}
                        />

                        {pageTitle && (
                            <div className="page-title">
                                {pageTitle}
                            </div>
                        )}
                    </div>

                    <div>
                        {!isLoggedIn ? (
                            <button className="icon-button" onClick={handleLogin} title="Login">
                                <BiLogIn />
                            </button>
                        ) : (
                            <div className="profile">
                                <div className="profile-icon" title="Account">
                                    <FiUser />
                                </div>
                                <button className="icon-button" onClick={handleLogout} title="Logout">
                                    <BiLogOut />
                                </button>
                            </div>
                        )}
                    </div>
                </nav>
                {children}
            </div>
        </>
    );
};

export default Navbar;