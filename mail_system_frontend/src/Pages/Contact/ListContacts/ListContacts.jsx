import { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
    FaAddressBook, FaTrash, FaExclamationTriangle, FaUserSlash,
    FaUserPlus, FaFileImport, FaTimes
} from "react-icons/fa";
import Navbar from "../../../Components/Navbar/Navbar";
import AddContact from "../AddContact/AddContact";
import ImportContacts from "../ImportContact/ImportContacts";
import "./ListContacts.scss";

const ListContacts = () => {
    const { listId } = useParams();
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [contactToDelete, setContactToDelete] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL}/lists/${listId}/contacts`,
                { withCredentials: true }
            );
            setContacts(res.data.contacts);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to fetch contacts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, [listId]);

    const handleDelete = async (contactId) => {
        try {
            await axios.delete(
                `${import.meta.env.VITE_API_URL}/contacts/${contactId}`,
                { withCredentials: true }
            );
            toast.success("Contact deleted");
            setContacts((prev) => prev.filter((c) => c.contactId !== contactId));
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete contact");
        } finally {
            setContactToDelete(null);
        }
    };

    const handleContactAdded = () => {
        setShowAddModal(false);
        fetchContacts();
    };

    const handleImportComplete = () => {
        fetchContacts();
        // modal stays open so the user can see the result summary
    };

    const getContactName = (contact) => {
        const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
        return fullName || "—";
    };

    const statusClass = (status) => {
        const normalized = (status || "").toLowerCase();
        if (normalized === "active" || normalized === "subscribed") return "lc-status--active";
        if (normalized === "unsubscribed" || normalized === "inactive") return "lc-status--inactive";
        if (normalized === "bounced" || normalized === "failed") return "lc-status--danger";
        return "lc-status--default";
    };

    return (
        <Navbar>
            <div className="lc-main">
                <div className="lc-header">
                    <div className="lc-headerText">
                        <h2 className="lc-pageTitle"><FaAddressBook /> List Contacts</h2>
                        <p className="lc-pageSubtitle">Everyone currently on this list</p>
                    </div>
                    <div className="lc-headerActions">
                        <button className="lc-addBtn" onClick={() => setShowAddModal(true)}>
                            <FaUserPlus /> Add Contact
                        </button>
                        <button className="lc-importBtn" onClick={() => setShowImportModal(true)}>
                            <FaFileImport /> Import
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="lc-loadingContainer">
                        <div className="lc-loadingSpinner"></div>
                        <p>Loading contacts...</p>
                    </div>
                ) : contacts.length === 0 ? (
                    <div className="lc-emptyState">
                        <div className="lc-emptyIconWrap">
                            <FaUserSlash className="lc-emptyIcon" />
                        </div>
                        <h4 className="lc-emptyTitle">No contacts yet</h4>
                        <p className="lc-emptyText">Add someone manually or import a file to get started.</p>
                    </div>
                ) : (
                    <div className="lc-tableWrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contacts.map((contact) => (
                                    <tr key={contact.contactId}>
                                        <td data-label="Name" className="lc-nameCell">{getContactName(contact)}</td>
                                        <td data-label="Email">{contact.email}</td>
                                        <td data-label="Status">
                                            <span className={`lc-statusBadge ${statusClass(contact.status)}`}>
                                                {contact.status || "Unknown"}
                                            </span>
                                        </td>
                                        <td data-label="Actions">
                                            <button
                                                className="lc-iconBtn lc-iconBtn--delete"
                                                onClick={() => setContactToDelete(contact)}
                                                title="Delete contact"
                                            >
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Add Contact modal — reuses AddContact as an embedded form */}
                {showAddModal && (
                    <div className="lc-modalOverlay" onClick={() => setShowAddModal(false)}>
                        <div className="lc-modalContent" onClick={(e) => e.stopPropagation()}>
                            <div className="lc-modalHeader">
                                <div className="lc-modalTitle">
                                    <span className="lc-modalTitleIcon"><FaUserPlus /></span>
                                    Add Contact
                                </div>
                                <button className="lc-modalClose" onClick={() => setShowAddModal(false)}>
                                    <FaTimes />
                                </button>
                            </div>
                            <div className="lc-modalBody">
                                <AddContact listId={listId} onContactAdded={handleContactAdded} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Import Contacts modal — reuses ImportContacts as an embedded form */}
                {showImportModal && (
                    <div className="lc-modalOverlay" onClick={() => setShowImportModal(false)}>
                        <div className="lc-modalContent" onClick={(e) => e.stopPropagation()}>
                            <div className="lc-modalHeader">
                                <div className="lc-modalTitle">
                                    <span className="lc-modalTitleIcon"><FaFileImport /></span>
                                    Import Contacts
                                </div>
                                <button className="lc-modalClose" onClick={() => setShowImportModal(false)}>
                                    <FaTimes />
                                </button>
                            </div>
                            <div className="lc-modalBody">
                                <ImportContacts listId={listId} onImportComplete={handleImportComplete} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Custom delete confirmation popup — no window.confirm used */}
                {contactToDelete && (
                    <div className="lc-confirmOverlay" onClick={() => setContactToDelete(null)}>
                        <div className="lc-confirmDialog" onClick={(e) => e.stopPropagation()}>
                            <div className="lc-confirmIcon"><FaExclamationTriangle /></div>
                            <h3>Delete Contact</h3>
                            <p>
                                Are you sure you want to delete{" "}
                                <strong>{contactToDelete.email}</strong>? This action cannot be undone.
                            </p>
                            <div className="lc-confirmButtons">
                                <button
                                    className="lc-confirmCancel"
                                    onClick={() => setContactToDelete(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="lc-confirmDelete"
                                    onClick={() => handleDelete(contactToDelete.contactId)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Navbar>
    );
};

export default ListContacts;