import { useState, useEffect } from "react";
import axios from "axios";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
    FaPaperPlane, FaCheckCircle, FaTimesCircle,
    FaChartBar, FaExclamationTriangle, FaEnvelope, FaUsers, FaTrash, FaBan, FaArrowLeft
} from "react-icons/fa";
import Navbar from "../../../Components/Navbar/Navbar";
import "./CampaignDetail.scss";

const CampaignDetail = () => {
    const { campaignId } = useParams();
    const navigate = useNavigate();
    const [campaign, setCampaign] = useState(null);
    const [preflight, setPreflight] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showSendConfirm, setShowSendConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchCampaign = async () => {
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL}/campaigns/${campaignId}`,
                { withCredentials: true }
            );
            setCampaign(res.data.campaign);
        } catch (error) {
            toast.error("Failed to fetch campaign");
        } finally {
            setLoading(false);
        }
    };

    const runPreflight = async () => {
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL}/campaigns/${campaignId}/preflight`,
                { withCredentials: true }
            );
            setPreflight(res.data);
        } catch (error) {
            toast.error("Preflight check failed");
        }
    };

    useEffect(() => {
        fetchCampaign();
        runPreflight();
    }, [campaignId]);

    const handleSend = async () => {
        setSending(true);
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/campaigns/${campaignId}/send`,
                {},
                { withCredentials: true }
            );
            toast.success(res.data.message || "Campaign queued for sending");
            fetchCampaign();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send campaign");
        } finally {
            setSending(false);
            setShowSendConfirm(false);
        }
    };

    const handleDelete = async () => {
        setActionLoading(true);
        try {
            await axios.delete(
                `${import.meta.env.VITE_API_URL}/campaigns/${campaignId}`,
                { withCredentials: true }
            );
            toast.success("Campaign deleted");
            navigate("/campaigns");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete campaign");
        } finally {
            setActionLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleCancel = async () => {
        setActionLoading(true);
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/campaigns/${campaignId}/cancel`,
                {},
                { withCredentials: true }
            );
            toast.success(res.data.message || "Campaign cancelled");
            fetchCampaign();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to cancel campaign");
        } finally {
            setActionLoading(false);
            setShowCancelConfirm(false);
        }
    };

    const statusClass = (status) => {
        const normalized = (status || "").toLowerCase();
        if (normalized === "draft") return "cd-status--draft";
        if (normalized === "sending" || normalized === "queued") return "cd-status--sending";
        if (normalized === "sent" || normalized === "completed") return "cd-status--sent";
        if (normalized === "failed" || normalized === "cancelled") return "cd-status--failed";
        return "cd-status--default";
    };

    if (loading) {
        return (
            <Navbar>
                <div className="cd-main">
                    <div className="cd-loadingContainer">
                        <div className="cd-loadingSpinner"></div>
                        <p>Loading campaign...</p>
                    </div>
                </div>
            </Navbar>
        );
    }

    if (!campaign) {
        return (
            <Navbar>
                <div className="cd-main">
                    <div className="cd-emptyState">
                        <FaExclamationTriangle className="cd-emptyIcon" />
                        <p>Campaign not found</p>
                    </div>
                </div>
            </Navbar>
        );
    }

    return (
        <Navbar>
            <div className="cd-main">
                <button className="cd-backBtn" onClick={() => navigate(-1)}>
                    <FaArrowLeft /> Back
                </button>

                <div className="cd-card">

                    <div className="cd-headerRow">
                        <h2 className="cd-title">{campaign.name}</h2>
                        <span className={`cd-statusBadge ${statusClass(campaign.status)}`}>
                            {campaign.status}
                        </span>
                    </div>

                    <div className="cd-metaGrid">
                        <div className="cd-metaItem">
                            <span className="cd-metaLabel">Subject</span>
                            <span className="cd-metaValue">{campaign.subject}</span>
                        </div>
                        <div className="cd-metaItem">
                            <span className="cd-metaLabel">From</span>
                            <span className="cd-metaValue">{campaign.fromName} &lt;{campaign.fromEmail}&gt;</span>
                        </div>
                        <div className="cd-metaItem">
                            <span className="cd-metaLabel">Reply-To</span>
                            <span className="cd-metaValue">{campaign.replyTo}</span>
                        </div>
                    </div>

                    <div className="cd-previewSection">
                        <h4 className="cd-sectionTitle"><FaEnvelope /> Email Preview</h4>
                        <div className="cd-previewFrame">
                            <div dangerouslySetInnerHTML={{ __html: campaign.html }} />
                        </div>
                    </div>

                    {preflight && campaign.status === "DRAFT" && (
                        <div className="cd-preflightSection">
                            <h4 className="cd-sectionTitle"><FaCheckCircle /> Preflight Check</h4>
                            <ul className="cd-preflightList">
                                {Object.entries(preflight.checks).map(([key, value]) => (
                                    <li key={key} className={`cd-preflightItem ${value ? "cd-preflightItem--pass" : "cd-preflightItem--fail"}`}>
                                        {value ? <FaCheckCircle /> : <FaTimesCircle />}
                                        <span>{key}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className={`cd-readyStatus ${preflight.readyToSend ? "cd-readyStatus--yes" : "cd-readyStatus--no"}`}>
                                Ready to send: <strong>{preflight.readyToSend ? "Yes" : "No"}</strong>
                            </p>
                        </div>
                    )}

                    {campaign.status === "DRAFT" && (
                        <div className="cd-draftActions">
                            <button
                                className="cd-sendBtn"
                                onClick={() => setShowSendConfirm(true)}
                                disabled={sending || !preflight?.readyToSend}
                            >
                                <FaPaperPlane /> {sending ? "Sending..." : "Send Campaign"}
                            </button>

                            <button
                                className="cd-deleteBtn"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={actionLoading}
                            >
                                <FaTrash /> Delete Campaign
                            </button>
                        </div>
                    )}

                    {["QUEUED", "SENDING"].includes(campaign.status) && (
                        <button
                            className="cd-cancelBtn"
                            onClick={() => setShowCancelConfirm(true)}
                            disabled={actionLoading}
                        >
                            <FaBan /> Cancel Campaign
                        </button>
                    )}

                    {campaign.status !== "DRAFT" && (
                        <div className="cd-statsSection">
                            <div className="cd-statsHeaderRow">
                                <h4 className="cd-sectionTitle"><FaChartBar /> Statistics</h4>
                                <Link to={`/campaigns/${campaignId}/recipients`} className="cd-viewRecipientsBtn">
                                    <FaUsers /> View Recipients
                                </Link>
                            </div>
                            <div className="cd-statsGrid">
                                <div className="cd-statItem">
                                    <span className="cd-statValue">{campaign.statistics.attempted}</span>
                                    <span className="cd-statLabel">Attempted</span>
                                </div>
                                <div className="cd-statItem cd-statItem--success">
                                    <span className="cd-statValue">{campaign.statistics.sent}</span>
                                    <span className="cd-statLabel">Sent</span>
                                </div>
                                <div className="cd-statItem cd-statItem--success">
                                    <span className="cd-statValue">{campaign.statistics.delivered}</span>
                                    <span className="cd-statLabel">Delivered</span>
                                </div>
                                <div className="cd-statItem cd-statItem--warning">
                                    <span className="cd-statValue">{campaign.statistics.bounced}</span>
                                    <span className="cd-statLabel">Bounced</span>
                                </div>
                                <div className="cd-statItem cd-statItem--danger">
                                    <span className="cd-statValue">{campaign.statistics.complained}</span>
                                    <span className="cd-statLabel">Complained</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom send confirmation popup */}
            {showSendConfirm && (
                <div className="cd-confirmOverlay" onClick={() => !sending && setShowSendConfirm(false)}>
                    <div className="cd-confirmDialog" onClick={(e) => e.stopPropagation()}>
                        <div className="cd-confirmIcon"><FaPaperPlane /></div>
                        <h3>Send this campaign?</h3>
                        <p>
                            <strong>{campaign.name}</strong> will be sent to everyone on the selected list.
                            This action cannot be undone.
                        </p>
                        <div className="cd-confirmButtons">
                            <button
                                className="cd-confirmCancel"
                                onClick={() => setShowSendConfirm(false)}
                                disabled={sending}
                            >
                                Cancel
                            </button>
                            <button
                                className="cd-confirmSend"
                                onClick={handleSend}
                                disabled={sending}
                            >
                                {sending ? "Sending..." : "Yes, Send It"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom delete confirmation popup */}
            {showDeleteConfirm && (
                <div className="cd-confirmOverlay" onClick={() => !actionLoading && setShowDeleteConfirm(false)}>
                    <div className="cd-confirmDialog" onClick={(e) => e.stopPropagation()}>
                        <div className="cd-confirmIcon"><FaTrash /></div>
                        <h3>Delete this campaign?</h3>
                        <p>
                            <strong>{campaign.name}</strong> will be permanently deleted. This cannot be undone.
                        </p>
                        <div className="cd-confirmButtons">
                            <button
                                className="cd-confirmCancel"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={actionLoading}
                            >
                                Cancel
                            </button>
                            <button
                                className="cd-confirmSend"
                                onClick={handleDelete}
                                disabled={actionLoading}
                            >
                                {actionLoading ? "Deleting..." : "Yes, Delete It"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom cancel confirmation popup */}
            {showCancelConfirm && (
                <div className="cd-confirmOverlay" onClick={() => !actionLoading && setShowCancelConfirm(false)}>
                    <div className="cd-confirmDialog" onClick={(e) => e.stopPropagation()}>
                        <div className="cd-confirmIcon"><FaBan /></div>
                        <h3>Cancel this campaign?</h3>
                        <p>
                            Emails already queued may still be sent. This only stops the campaign from being marked as active going forward.
                        </p>
                        <div className="cd-confirmButtons">
                            <button
                                className="cd-confirmCancel"
                                onClick={() => setShowCancelConfirm(false)}
                                disabled={actionLoading}
                            >
                                Go Back
                            </button>
                            <button
                                className="cd-confirmSend"
                                onClick={handleCancel}
                                disabled={actionLoading}
                            >
                                {actionLoading ? "Cancelling..." : "Yes, Cancel It"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Navbar>
    );
};

export default CampaignDetail;