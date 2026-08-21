import { useState, useEffect } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import {
    FaUsers, FaArrowLeft, FaSyncAlt,
    FaChartPie, FaInbox, FaFileExcel, FaSearch
} from "react-icons/fa";
import Navbar from "../../../Components/Navbar/Navbar";
import "./CampaignRecipients.scss";

const STATUS_OPTIONS = [
    "PENDING", "QUEUED", "SENT", "DELIVERED", "BOUNCED",
    "COMPLAINED", "FAILED", "OPENED", "CLICKED", "CANCELLED"
];

const CampaignRecipients = () => {
    const { campaignId } = useParams();
    const [recipients, setRecipients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 20 });

    const fetchRecipients = async () => {
        setLoading(true);
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL}/campaigns/${campaignId}/recipients`,
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
            setRecipients(res.data.recipients);
            setPagination(res.data.pagination);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to fetch recipients");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecipients();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [campaignId, page, searchTerm, statusFilter]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, statusFilter]);

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleString();
    };

    const getContactName = (recipient) => {
        const fullName = `${recipient.contactFirstName || ""} ${recipient.contactLastName || ""}`.trim();
        return fullName || "-";
    };

    const statusClass = (status) => {
        const normalized = (status || "").toLowerCase();
        if (normalized === "sent" || normalized === "delivered" || normalized === "opened" || normalized === "clicked") return "cr-status--success";
        if (normalized === "bounced" || normalized === "failed" || normalized === "complained") return "cr-status--danger";
        if (normalized === "pending" || normalized === "queued") return "cr-status--neutral";
        return "cr-status--default";
    };

    const isFiltered = searchTerm.trim() !== "" || statusFilter !== "";

    // Approximate counts from the current page only - full accurate breakdown would need
    // a separate aggregate endpoint, this is a lightweight summary of what's visible
    const statusCounts = recipients.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
    }, {});

    const handleExportExcel = async () => {
        setExporting(true);
        try {
            // Export endpoint applies the SAME search/status filters but returns everything
            // matching them, not just the current page
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL}/campaigns/${campaignId}/recipients/export`,
                {
                    withCredentials: true,
                    params: {
                        search: searchTerm.trim() || undefined,
                        status: statusFilter || undefined
                    }
                }
            );

            const dataToExport = res.data.recipients;

            if (dataToExport.length === 0) {
                toast.error("No recipients to export");
                return;
            }

            const exportData = dataToExport.map((recipient) => ({
                "Name": getContactName(recipient),
                "Email": recipient.contactEmail || "-",
                "Status": recipient.status,
                "Sent At": formatDate(recipient.sentAt),
                "Delivered At": formatDate(recipient.deliveredAt),
                "Opened At": formatDate(recipient.openedAt),
                "Clicked At": formatDate(recipient.clickedAt),
                "Fail Reason": recipient.failReason || "-"
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Recipients");

            const fileName = isFiltered
                ? `campaign-recipients-${campaignId}-filtered.xlsx`
                : `campaign-recipients-${campaignId}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            toast.success(isFiltered ? "Filtered results exported" : "Exported successfully");
        } catch (error) {
            toast.error(error.response?.data?.message || "Export failed");
        } finally {
            setExporting(false);
        }
    };

    return (
        <Navbar>
            <div className="cr-main">
                <div className="cr-header">
                    <div>
                        <h2 className="cr-pageTitle"><FaUsers /> Campaign Recipients</h2>
                        <Link className="cr-backLink" to={`/campaigns/${campaignId}`}>
                            <FaArrowLeft /> Back to Campaign
                        </Link>
                    </div>
                    <div className="cr-headerActions">
                        <button
                            className="cr-exportBtn"
                            onClick={handleExportExcel}
                            disabled={loading || exporting || pagination.total === 0}
                            title={isFiltered ? "Exports only the filtered results" : "Exports all recipients"}
                        >
                            <FaFileExcel /> {exporting ? "Exporting..." : isFiltered ? "Export Filtered" : "Export to Excel"}
                        </button>
                        <button
                            className="cr-refreshBtn"
                            onClick={fetchRecipients}
                            disabled={loading}
                        >
                            <FaSyncAlt className={loading ? "cr-spinIcon" : ""} />
                            {loading ? "Refreshing..." : "Refresh"}
                        </button>
                    </div>
                </div>

                <div className="cr-toolbar">
                    <div className="cr-searchBox">
                        <FaSearch className="cr-searchIcon" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <select
                        className="cr-statusSelect"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>

                <div className="cr-summaryCard">
                    <h4 className="cr-summaryTitle">
                        <FaChartPie /> Summary {isFiltered && <span className="cr-summaryFilteredTag">Filtered</span>}
                    </h4>
                    <div className="cr-summaryStats">
                        <span className="cr-summaryTotal">Total: {pagination.total}</span>
                        {Object.entries(statusCounts).map(([status, count]) => (
                            <span key={status} className={`cr-summaryPill ${statusClass(status)}`}>
                                {status}: {count} (this page)
                            </span>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="cr-loadingContainer">
                        <div className="cr-loadingSpinner"></div>
                        <p>Loading recipients...</p>
                    </div>
                ) : recipients.length === 0 ? (
                    <div className="cr-emptyState">
                        <FaInbox className="cr-emptyIcon" />
                        <p>{isFiltered ? "No recipients match your search or filter." : "No recipients found for this campaign."}</p>
                    </div>
                ) : (
                    <>
                        <div className="cr-tableWrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Status</th>
                                        <th>Sent At</th>
                                        <th>Delivered At</th>
                                        <th>Opened At</th>
                                        <th>Clicked At</th>
                                        <th>Fail Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recipients.map((recipient) => (
                                        <tr key={recipient.campaignRecipientId}>
                                            <td data-label="Name">{getContactName(recipient)}</td>
                                            <td data-label="Email">{recipient.contactEmail || "-"}</td>
                                            <td data-label="Status">
                                                <span className={`cr-statusBadge ${statusClass(recipient.status)}`}>
                                                    {recipient.status}
                                                </span>
                                            </td>
                                            <td data-label="Sent At">{formatDate(recipient.sentAt)}</td>
                                            <td data-label="Delivered At">{formatDate(recipient.deliveredAt)}</td>
                                            <td data-label="Opened At">{formatDate(recipient.openedAt)}</td>
                                            <td data-label="Clicked At">{formatDate(recipient.clickedAt)}</td>
                                            <td data-label="Fail Reason" className="cr-failReason">
                                                {recipient.failReason || "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {pagination.totalPages > 1 && (
                            <div className="cr-pagination">
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
        </Navbar>
    );
};

export default CampaignRecipients;