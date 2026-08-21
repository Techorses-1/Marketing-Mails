import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
    FaUsers, FaUserCheck, FaBan, FaListUl,
    FaPaperPlane, FaCheckCircle, FaEnvelope,
    FaChartLine, FaExclamationTriangle, FaEnvelopeOpenText,
    FaMousePointer, FaChartBar, FaInbox, FaArrowRight
} from "react-icons/fa";
import Navbar from "../../Components/Navbar/Navbar";
import "./Home.scss";

const Home = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL}/dashboard`,
                { withCredentials: true }
            );
            setData(res.data);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString();
    };

    const statusClass = (status) => {
        const normalized = (status || "").toLowerCase();
        if (normalized === "draft") return "dh-status--draft";
        if (normalized === "sending" || normalized === "queued") return "dh-status--sending";
        if (normalized === "sent" || normalized === "completed") return "dh-status--sent";
        if (normalized === "failed" || normalized === "cancelled") return "dh-status--failed";
        return "dh-status--default";
    };

    if (loading) {
        return (
            <Navbar>
                <div className="dh-main">
                    <div className="dh-loadingContainer">
                        <div className="dh-loadingSpinner"></div>
                        <p>Loading dashboard...</p>
                    </div>
                </div>
            </Navbar>
        );
    }

    if (!data) {
        return (
            <Navbar>
                <div className="dh-main">
                    <div className="dh-emptyState">
                        <FaExclamationTriangle className="dh-emptyIcon" />
                        <p>Failed to load dashboard data.</p>
                    </div>
                </div>
            </Navbar>
        );
    }

    const { overview, deliverability, engagement, suppressionBreakdown, recentCampaigns } = data;

    const overviewCards = [
        { icon: <FaUsers />, value: overview.totalContacts, label: "Total Contacts" },
        { icon: <FaUserCheck />, value: overview.activeContacts, label: "Active Contacts" },
        { icon: <FaBan />, value: overview.suppressedContacts, label: "Suppressed Contacts" },
        { icon: <FaListUl />, value: overview.totalLists, label: "Total Lists" },
        { icon: <FaPaperPlane />, value: overview.totalCampaigns, label: "Total Campaigns" },
        { icon: <FaCheckCircle />, value: overview.completedCampaigns, label: "Completed Campaigns" },
        { icon: <FaEnvelope />, value: overview.totalEmailsSent, label: "Total Emails Sent" }
    ];

    const bounceWarning = deliverability.bounceRate > 0.3;
    const complaintWarning = deliverability.complaintRate > 0.1;

    return (
        <Navbar>
            <div className="dh-main">
                <div className="dh-header">
                    <h2 className="dh-pageTitle"><FaChartBar /> Dashboard</h2>
                    <p className="dh-pageSubtitle">A snapshot of your contacts, campaigns, and deliverability</p>
                </div>

                {/* Overview cards */}
                <section className="dh-section">
                    <h3 className="dh-sectionTitle">Overview</h3>
                    <div className="dh-overviewGrid">
                        {overviewCards.map((card, i) => (
                            <div className="dh-overviewCard" key={i}>
                                <span className="dh-overviewIcon">{card.icon}</span>
                                <span className="dh-overviewValue">{card.value}</span>
                                <span className="dh-overviewLabel">{card.label}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Deliverability + Engagement side by side */}
                <div className="dh-twoColGrid">
                    <section className="dh-section">
                        <h3 className="dh-sectionTitle"><FaChartLine /> Deliverability Health</h3>
                        <div className="dh-panel">
                            <div className="dh-metricRow">
                                <div className="dh-metricItem">
                                    <span className="dh-metricValue dh-metricValue--success">{deliverability.deliveryRate}%</span>
                                    <span className="dh-metricLabel">Delivery Rate</span>
                                </div>
                                <div className="dh-metricItem">
                                    <span className={`dh-metricValue ${bounceWarning ? "dh-metricValue--danger" : ""}`}>{deliverability.bounceRate}%</span>
                                    <span className="dh-metricLabel">Bounce Rate</span>
                                </div>
                                <div className="dh-metricItem">
                                    <span className={`dh-metricValue ${complaintWarning ? "dh-metricValue--danger" : ""}`}>{deliverability.complaintRate}%</span>
                                    <span className="dh-metricLabel">Complaint Rate</span>
                                </div>
                            </div>

                            {(bounceWarning || complaintWarning) && (
                                <div className="dh-warningStack">
                                    {bounceWarning && (
                                        <div className="dh-warningBanner">
                                            <FaExclamationTriangle />
                                            <span>Bounce rate is above AWS's recommended 0.3% threshold - check your list quality.</span>
                                        </div>
                                    )}
                                    {complaintWarning && (
                                        <div className="dh-warningBanner">
                                            <FaExclamationTriangle />
                                            <span>Complaint rate is above AWS's recommended 0.1% threshold - review recent campaign content.</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="dh-section">
                        <h3 className="dh-sectionTitle"><FaEnvelopeOpenText /> Engagement</h3>
                        <div className="dh-panel">
                            <div className="dh-metricRow dh-metricRow--two">
                                <div className="dh-metricItem">
                                    <span className="dh-metricIcon"><FaEnvelopeOpenText /></span>
                                    <span className="dh-metricValue dh-metricValue--primary">{engagement.openRate}%</span>
                                    <span className="dh-metricLabel">Open Rate</span>
                                </div>
                                <div className="dh-metricItem">
                                    <span className="dh-metricIcon"><FaMousePointer /></span>
                                    <span className="dh-metricValue dh-metricValue--primary">{engagement.clickRate}%</span>
                                    <span className="dh-metricLabel">Click Rate</span>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Suppression breakdown */}
                <section className="dh-section">
                    <h3 className="dh-sectionTitle">Suppression Breakdown</h3>
                    <div className="dh-suppressionRow">
                        <span className="dh-suppressionPill dh-suppressionPill--danger">Bounced: {suppressionBreakdown.bounced}</span>
                        <span className="dh-suppressionPill dh-suppressionPill--danger">Complained: {suppressionBreakdown.complained}</span>
                        <span className="dh-suppressionPill dh-suppressionPill--neutral">Unsubscribed: {suppressionBreakdown.unsubscribed}</span>
                        <span className="dh-suppressionPill dh-suppressionPill--neutral">Invalid: {suppressionBreakdown.invalid}</span>
                    </div>
                </section>

                {/* Recent campaigns */}
                <section className="dh-section">
                    <div className="dh-sectionHeaderRow">
                        <h3 className="dh-sectionTitle"><FaChartBar /> Recent Campaigns</h3>
                        <Link to="/campaigns" className="dh-viewAllLink">
                            View All Campaigns <FaArrowRight />
                        </Link>
                    </div>

                    {recentCampaigns.length === 0 ? (
                        <div className="dh-emptyState dh-emptyState--inline">
                            <FaInbox className="dh-emptyIcon" />
                            <p>No campaigns yet.</p>
                        </div>
                    ) : (
                        <div className="dh-tableWrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Status</th>
                                        <th>Sent</th>
                                        <th>Delivered</th>
                                        <th>Created</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentCampaigns.map((campaign) => (
                                        <tr key={campaign.campaignId}>
                                            <td data-label="Name" className="dh-nameCell">{campaign.name}</td>
                                            <td data-label="Status">
                                                <span className={`dh-statusBadge ${statusClass(campaign.status)}`}>
                                                    {campaign.status}
                                                </span>
                                            </td>
                                            <td data-label="Sent">{campaign.statistics?.sent ?? 0}</td>
                                            <td data-label="Delivered">{campaign.statistics?.delivered ?? 0}</td>
                                            <td data-label="Created">{formatDate(campaign.createdAt)}</td>
                                            <td data-label="Actions">
                                                <Link to={`/campaigns/${campaign.campaignId}`} className="dh-viewBtn">
                                                    View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </Navbar>
    );
};

export default Home;