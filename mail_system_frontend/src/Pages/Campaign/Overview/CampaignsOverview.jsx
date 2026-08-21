import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FaPlus, FaTimes, FaChartBar, FaPaperPlane, FaInbox, FaTrash, FaBan, FaSearch } from "react-icons/fa";
import Navbar from "../../../Components/Navbar/Navbar";
import CreateCampaign from "../CreateCampaign";
import "./CampaignsOverview.scss";

const STATUS_OPTIONS = ["DRAFT", "QUEUED", "SENDING", "COMPLETED", "CANCELLED", "FAILED"];

const CampaignsOverview = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [lists, setLists] = useState([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 20 });

    // Modal state
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelCampaignId, setCancelCampaignId] = useState(null);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL}/campaigns`,
                {
                    withCredentials: true,
                    params: {
                        page,
                        limit: 20,
                        search: searchTerm.trim() || undefined,
                        status: statusFilter || undefined
                    }
                }
            );
            setCampaigns(res.data.campaigns);
            setPagination(res.data.pagination);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to fetch campaigns");
        } finally {
            setLoading(false);
        }
    };

    const fetchFormData = async () => {
        try {
            const [templatesRes, listsRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/templates`, { withCredentials: true }),
                axios.get(`${import.meta.env.VITE_API_URL}/lists`, { withCredentials: true })
            ]);
            setTemplates(templatesRes.data.templates);
            setLists(listsRes.data.lists);
        } catch (error) {
            toast.error("Failed to load templates/lists");
        }
    };

    useEffect(() => {
        fetchFormData();
    }, []);

    // Refetch whenever page, search, or status changes - backend does the actual filtering
    useEffect(() => {
        fetchCampaigns();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, searchTerm, statusFilter]);

    // Reset to page 1 whenever the search or status filter changes
    useEffect(() => {
        setPage(1);
    }, [searchTerm, statusFilter]);

    const handleCampaignCreated = (newCampaign) => {
        setShowCreateForm(false);
        setPage(1);
        fetchCampaigns();
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleString();
    };

    const statusClass = (status) => {
        const normalized = (status || "").toLowerCase();
        if (normalized === "draft") return "co-status--draft";
        if (normalized === "sending" || normalized === "queued") return "co-status--sending";
        if (normalized === "sent" || normalized === "completed") return "co-status--sent";
        if (normalized === "failed" || normalized === "cancelled") return "co-status--failed";
        return "co-status--default";
    };

    const handleDelete = async (campaignId) => {
        setActionId(campaignId);
        try {
            await axios.delete(
                `${import.meta.env.VITE_API_URL}/campaigns/${campaignId}`,
                { withCredentials: true }
            );
            toast.success("Campaign deleted successfully", { position: "top-center" });
            fetchCampaigns();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete campaign", { position: "top-center" });
        } finally {
            setActionId(null);
        }
    };

    // Open cancel confirmation modal
    const openCancelModal = (campaignId) => {
        setCancelCampaignId(campaignId);
        setShowCancelModal(true);
    };

    // Close cancel modal
    const closeCancelModal = () => {
        setShowCancelModal(false);
        setCancelCampaignId(null);
    };

    // Handle cancel confirmation
    const handleConfirmCancel = async () => {
        if (!cancelCampaignId) return;

        setActionId(cancelCampaignId);
        setShowCancelModal(false);

        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/campaigns/${cancelCampaignId}/cancel`,
                {},
                { withCredentials: true }
            );
            toast.success(res.data.message || "Campaign cancelled successfully", { position: "top-center" });
            fetchCampaigns();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to cancel campaign", { position: "top-center" });
        } finally {
            setActionId(null);
            setCancelCampaignId(null);
        }
    };

    return (
        <Navbar>
            <div className="co-main">
                <div className="co-header">
                    <div className="co-headerText">
                        <h2 className="co-pageTitle"><FaPaperPlane /> Campaigns</h2>
                        <p className="co-pageSubtitle">Create, send, and track your email campaigns</p>
                    </div>
                    <button
                        className={`co-createToggleBtn ${showCreateForm ? "co-createToggleBtn--active" : ""}`}
                        onClick={() => setShowCreateForm((prev) => !prev)}
                    >
                        {showCreateForm ? (<><FaTimes /> Close</>) : (<><FaPlus /> Create Campaign</>)}
                    </button>
                </div>

                {showCreateForm && (
                    <div className="co-createFormWrapper">
                        <CreateCampaign
                            templates={templates}
                            lists={lists}
                            onCampaignCreated={handleCampaignCreated}
                        />
                    </div>
                )}

                <div className="co-toolbar">
                    <div className="co-searchBox">
                        <FaSearch className="co-searchIcon" />
                        <input
                            type="text"
                            placeholder="Search by campaign name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <select
                        className="co-statusSelect"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>

                <div className="co-tableSection">
                    <div className="co-tableSectionHeader">
                        <h3 className="co-tableSectionTitle">All Campaigns</h3>
                        {!loading && (
                            <span className="co-tableCount">{pagination.total}</span>
                        )}
                    </div>

                    {loading ? (
                        <div className="co-loadingContainer">
                            <div className="co-loadingSpinner"></div>
                            <p>Loading campaigns...</p>
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="co-emptyState">
                            <div className="co-emptyIconWrap">
                                <FaInbox className="co-emptyIcon" />
                            </div>
                            <h4 className="co-emptyTitle">No campaigns found</h4>
                            <p className="co-emptyText">
                                {searchTerm || statusFilter
                                    ? "Try adjusting your search or filter."
                                    : "Create your first campaign to start sending emails."}
                            </p>
                            {!searchTerm && !statusFilter && (
                                <button className="co-emptyCta" onClick={() => setShowCreateForm(true)}>
                                    <FaPlus /> Create Campaign
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="co-tableWrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Status</th>
                                            <th>Attempted</th>
                                            <th>Sent</th>
                                            <th>Delivered</th>
                                            <th>Bounced</th>
                                            <th>Created</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {campaigns.map((campaign) => (
                                            <tr key={campaign.campaignId}>
                                                <td data-label="Name" className="co-nameCell">{campaign.name}</td>
                                                <td data-label="Status">
                                                    <span className={`co-statusBadge ${statusClass(campaign.status)}`}>
                                                        {campaign.status}
                                                    </span>
                                                </td>
                                                <td data-label="Attempted">{campaign.statistics?.attempted ?? 0}</td>
                                                <td data-label="Sent">{campaign.statistics?.sent ?? 0}</td>
                                                <td data-label="Delivered">{campaign.statistics?.delivered ?? 0}</td>
                                                <td data-label="Bounced">{campaign.statistics?.bounced ?? 0}</td>
                                                <td data-label="Created">{formatDate(campaign.createdAt)}</td>
                                                <td data-label="Actions">
                                                    <div className="co-actions">
                                                        <Link className="co-iconBtn co-iconBtn--view" to={`/campaigns/${campaign.campaignId}`} title="View campaign">
                                                            <FaChartBar />
                                                        </Link>

                                                        {campaign.status === "DRAFT" && (
                                                            <button
                                                                className="co-iconBtn co-iconBtn--delete"
                                                                disabled={actionId === campaign.campaignId}
                                                                onClick={() => handleDelete(campaign.campaignId)}
                                                                title="Delete campaign"
                                                            >
                                                                <FaTrash />
                                                            </button>
                                                        )}

                                                        {["QUEUED", "SENDING"].includes(campaign.status) && (
                                                            <button
                                                                className="co-iconBtn co-iconBtn--cancel"
                                                                disabled={actionId === campaign.campaignId}
                                                                onClick={() => openCancelModal(campaign.campaignId)}
                                                                title="Cancel campaign"
                                                            >
                                                                <FaBan />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {pagination.totalPages > 1 && (
                                <div className="co-pagination">
                                    <button
                                        disabled={page <= 1}
                                        onClick={() => setPage((p) => Math.max(p - 1, 1))}
                                    >
                                        Previous
                                    </button>
                                    <span>Page {pagination.page} of {pagination.totalPages}</span>
                                    <button
                                        disabled={page >= pagination.totalPages}
                                        onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Cancel Confirmation Modal */}
                {showCancelModal && (
                    <div className="co-modal-overlay" onClick={closeCancelModal}>
                        <div className="co-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="co-modal-header">
                                <h3 className="co-modal-title">Cancel Campaign</h3>
                                <button className="co-modal-close" onClick={closeCancelModal}>
                                    <FaTimes />
                                </button>
                            </div>
                            <div className="co-modal-body">
                                <p>Are you sure you want to cancel this campaign?</p>
                                <p className="co-modal-warning">This action cannot be undone.</p>
                            </div>
                            <div className="co-modal-footer">
                                <button className="co-modal-btn co-modal-btn--cancel" onClick={closeCancelModal}>
                                    No, Keep It
                                </button>
                                <button className="co-modal-btn co-modal-btn--danger" onClick={handleConfirmCancel}>
                                    Yes, Cancel Campaign
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Navbar>
    );
};

export default CampaignsOverview;