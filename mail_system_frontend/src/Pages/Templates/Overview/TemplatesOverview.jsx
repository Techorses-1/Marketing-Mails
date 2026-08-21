import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
    FaFileCode, FaTrash, FaPaperclip, FaExclamationTriangle,
    FaFileAlt, FaEye, FaEdit, FaSave, FaTimes, FaDownload, FaPlus
} from "react-icons/fa";
import Navbar from "../../../Components/Navbar/Navbar";
import CreateTemplate from "../CreateTemplate";
import "./TemplatesOverview.scss";

const TemplatesOverview = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState(null);
    const [viewingTemplate, setViewingTemplate] = useState(null);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [editValues, setEditValues] = useState({ name: "", subject: "", html: "", text: "" });
    const [editErrors, setEditErrors] = useState({});
    const [savingEdit, setSavingEdit] = useState(false);
    const [keptAttachments, setKeptAttachments] = useState([]);
    const [newAttachmentFiles, setNewAttachmentFiles] = useState([]);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL}/templates`,
                { withCredentials: true }
            );
            setTemplates(res.data.templates);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to fetch templates");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleTemplateCreated = (newTemplate) => {
        setTemplates((prev) => [newTemplate, ...prev]);
        setShowCreateForm(false);
    };

    const handleDelete = async (templateId) => {
        try {
            await axios.delete(
                `${import.meta.env.VITE_API_URL}/templates/${templateId}`,
                { withCredentials: true }
            );
            toast.success("Template deleted");
            setTemplates((prev) => prev.filter((t) => t.templateId !== templateId));
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete template");
        } finally {
            setTemplateToDelete(null);
        }
    };

    // ── View modal ──
    const openView = (template) => setViewingTemplate(template);
    const closeView = () => setViewingTemplate(null);

    // ── Edit modal ──
    const openEdit = (template) => {
        setEditingTemplate(template);
        setEditValues({
            name: template.name || "",
            subject: template.subject || "",
            html: template.html || "",
            text: template.text || ""
        });
        setEditErrors({});
        setKeptAttachments(template.attachments || []);
        setNewAttachmentFiles([]);
    };

    const closeEdit = () => {
        setEditingTemplate(null);
        setEditErrors({});
        setKeptAttachments([]);
        setNewAttachmentFiles([]);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditValues((prev) => ({ ...prev, [name]: value }));
        if (editErrors[name]) setEditErrors((prev) => ({ ...prev, [name]: null }));
    };

    const validateEdit = (values) => {
        const errors = {};
        if (!values.name) errors.name = "Template name is required";
        if (!values.subject) errors.subject = "Subject is required";
        if (!values.html) errors.html = "HTML content is required";
        return errors;
    };

    const handleRemoveExistingAttachment = (fileUrl) => {
        setKeptAttachments((prev) => prev.filter((att) => att.fileUrl !== fileUrl));
    };

    const handleNewFilesSelected = (e) => {
        const selected = Array.from(e.target.files);
        const totalCount = keptAttachments.length + newAttachmentFiles.length + selected.length;

        if (totalCount > 5) {
            toast.error(`A template can have at most 5 attachments total (currently would be ${totalCount})`);
            return;
        }

        setNewAttachmentFiles((prev) => [...prev, ...selected]);
        e.target.value = "";
    };

    const handleRemoveNewFile = (index) => {
        setNewAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleEditSave = async () => {
        const errors = validateEdit(editValues);
        if (Object.keys(errors).length > 0) {
            setEditErrors(errors);
            toast.error("Please fix the errors before saving");
            return;
        }

        setSavingEdit(true);
        try {
            const originalAttachments = editingTemplate.attachments || [];
            const removedAttachments = originalAttachments.filter(
                (att) => !keptAttachments.some((kept) => kept.fileUrl === att.fileUrl)
            );

            const formData = new FormData();
            formData.append("name", editValues.name);
            formData.append("subject", editValues.subject);
            formData.append("html", editValues.html);
            formData.append("text", editValues.text);

            if (removedAttachments.length > 0) {
                formData.append(
                    "removeAttachments",
                    JSON.stringify(removedAttachments.map((att) => att.fileUrl))
                );
            }

            newAttachmentFiles.forEach((file) => {
                formData.append("attachments", file);
            });

            const res = await axios.patch(
                `${import.meta.env.VITE_API_URL}/templates/${editingTemplate.templateId}`,
                formData,
                {
                    withCredentials: true,
                    headers: { "Content-Type": "multipart/form-data" }
                }
            );

            toast.success(res.data.message || "Template updated");
            setTemplates((prev) =>
                prev.map((t) => (t.templateId === editingTemplate.templateId ? res.data.template : t))
            );
            closeEdit();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update template");
        } finally {
            setSavingEdit(false);
        }
    };

    return (
        <Navbar>
            <div className="to-main">
                <div className="to-header">
                    <div className="to-headerText">
                        <h2 className="to-pageTitle"><FaFileCode /> Templates</h2>
                        <p className="to-pageSubtitle">Reusable email templates for your campaigns</p>
                    </div>
                    <button
                        className={`to-createToggleBtn ${showCreateForm ? "to-createToggleBtn--active" : ""}`}
                        onClick={() => setShowCreateForm((prev) => !prev)}
                    >
                        {showCreateForm ? (<><FaTimes /> Close</>) : (<><FaPlus /> Create Template</>)}
                    </button>
                </div>

                {showCreateForm && (
                    <div className="to-createFormWrapper">
                        <CreateTemplate onTemplateCreated={handleTemplateCreated} />
                    </div>
                )}

                <div className="to-tableSection">
                    <div className="to-tableSectionHeader">
                        <h3 className="to-tableSectionTitle">All Templates</h3>
                        {!loading && templates.length > 0 && (
                            <span className="to-tableCount">{templates.length}</span>
                        )}
                    </div>

                    {loading ? (
                        <div className="to-loadingContainer">
                            <div className="to-loadingSpinner"></div>
                            <p>Loading templates...</p>
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="to-emptyState">
                            <div className="to-emptyIconWrap">
                                <FaFileAlt className="to-emptyIcon" />
                            </div>
                            <h4 className="to-emptyTitle">No templates yet</h4>
                            <p className="to-emptyText">Create your first reusable email template to get started.</p>
                            <button className="to-emptyCta" onClick={() => setShowCreateForm(true)}>
                                <FaPlus /> Create Template
                            </button>
                        </div>
                    ) : (
                        <div className="to-tableWrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Subject</th>
                                        <th>Attachments</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {templates.map((template) => (
                                        <tr key={template.templateId}>
                                            <td data-label="Name" className="to-nameCell">{template.name}</td>
                                            <td data-label="Subject" className="to-subjectCell">{template.subject}</td>
                                            <td data-label="Attachments">
                                                <span className="to-attachmentCount">
                                                    <FaPaperclip /> {template.attachments?.length || 0}
                                                </span>
                                            </td>
                                            <td data-label="Actions">
                                                <div className="to-actionButtons">
                                                    <button
                                                        className="to-iconBtn to-iconBtn--view"
                                                        onClick={() => openView(template)}
                                                        title="View template"
                                                    >
                                                        <FaEye />
                                                    </button>
                                                    <button
                                                        className="to-iconBtn to-iconBtn--edit"
                                                        onClick={() => openEdit(template)}
                                                        title="Edit template"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                    <button
                                                        className="to-iconBtn to-iconBtn--delete"
                                                        onClick={() => setTemplateToDelete(template)}
                                                        title="Delete template"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* View modal — read only */}
            {viewingTemplate && (
                <div className="to-modalOverlay" onClick={closeView}>
                    <div className="to-modalContent" onClick={(e) => e.stopPropagation()}>
                        <div className="to-modalHeader">
                            <div className="to-modalTitle">
                                <span className="to-modalTitleIcon"><FaEye /></span>
                                {viewingTemplate.name}
                            </div>
                            <button className="to-modalClose" onClick={closeView}>
                                <FaTimes />
                            </button>
                        </div>

                        <div className="to-modalBody">
                            <div className="to-viewRow">
                                <span className="to-viewLabel">Subject</span>
                                <span className="to-viewValue">{viewingTemplate.subject}</span>
                            </div>

                            <div className="to-viewRow">
                                <span className="to-viewLabel">HTML Content</span>
                                <pre className="to-viewCode">{viewingTemplate.html}</pre>
                            </div>

                            {viewingTemplate.text && (
                                <div className="to-viewRow">
                                    <span className="to-viewLabel">Plain Text</span>
                                    <pre className="to-viewCode">{viewingTemplate.text}</pre>
                                </div>
                            )}

                            <div className="to-viewRow">
                                <span className="to-viewLabel">Attachments</span>
                                {viewingTemplate.attachments && viewingTemplate.attachments.length > 0 ? (
                                    <ul className="to-viewAttachmentList">
                                        {viewingTemplate.attachments.map((att, i) => (
                                            <li key={i} className="to-viewAttachmentItem">
                                                <FaFileAlt />
                                                <span className="to-viewAttachmentName">{att.fileName}</span>
                                                <span className="to-viewAttachmentSize">
                                                    {(att.fileSize / 1024).toFixed(1)} KB
                                                </span>
                                                <a
                                                    href={`${import.meta.env.VITE_API_URL}${att.fileUrl}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="to-viewAttachmentDownload"
                                                >
                                                    <FaDownload />
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <span className="to-viewValue">No attachments</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit modal */}
            {editingTemplate && (
                <div className="to-modalOverlay" onClick={closeEdit}>
                    <div className="to-modalContent" onClick={(e) => e.stopPropagation()}>
                        <div className="to-modalHeader">
                            <div className="to-modalTitle">
                                <span className="to-modalTitleIcon"><FaEdit /></span>
                                Edit Template
                            </div>
                            <button className="to-modalClose" onClick={closeEdit}>
                                <FaTimes />
                            </button>
                        </div>

                        <div className="to-modalBody">
                            <div className="to-editGroup">
                                <label className="to-editLabel">Template Name</label>
                                <input
                                    className={`to-editInput ${editErrors.name ? "error" : ""}`}
                                    type="text"
                                    name="name"
                                    value={editValues.name}
                                    onChange={handleEditChange}
                                />
                                {editErrors.name && <div className="to-editError">{editErrors.name}</div>}
                            </div>

                            <div className="to-editGroup">
                                <label className="to-editLabel">Subject</label>
                                <input
                                    className={`to-editInput ${editErrors.subject ? "error" : ""}`}
                                    type="text"
                                    name="subject"
                                    value={editValues.subject}
                                    onChange={handleEditChange}
                                />
                                {editErrors.subject && <div className="to-editError">{editErrors.subject}</div>}
                            </div>

                            <div className="to-editGroup">
                                <label className="to-editLabel">HTML Content</label>
                                <textarea
                                    className={`to-editTextarea to-editTextarea--code ${editErrors.html ? "error" : ""}`}
                                    name="html"
                                    rows={10}
                                    value={editValues.html}
                                    onChange={handleEditChange}
                                />
                                {editErrors.html && <div className="to-editError">{editErrors.html}</div>}
                            </div>

                            <div className="to-editGroup">
                                <label className="to-editLabel">Plain Text (optional)</label>
                                <textarea
                                    className="to-editTextarea"
                                    name="text"
                                    rows={5}
                                    value={editValues.text}
                                    onChange={handleEditChange}
                                />
                            </div>

                            <div className="to-editGroup">
                                <label className="to-editLabel">
                                    Attachments <span className="to-editNote">(max 5 total)</span>
                                </label>

                                {keptAttachments.length > 0 && (
                                    <ul className="to-viewAttachmentList">
                                        {keptAttachments.map((att, i) => (
                                            <li key={i} className="to-viewAttachmentItem">
                                                <FaFileAlt />
                                                <span className="to-viewAttachmentName">{att.fileName}</span>
                                                <span className="to-viewAttachmentSize">
                                                    {(att.fileSize / 1024).toFixed(1)} KB
                                                </span>
                                                <button
                                                    type="button"
                                                    className="to-attachmentRemoveBtn"
                                                    onClick={() => handleRemoveExistingAttachment(att.fileUrl)}
                                                    title="Remove this attachment"
                                                >
                                                    <FaTimes />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {newAttachmentFiles.length > 0 && (
                                    <ul className="to-viewAttachmentList">
                                        {newAttachmentFiles.map((file, i) => (
                                            <li key={i} className="to-viewAttachmentItem to-viewAttachmentItem--new">
                                                <FaFileAlt />
                                                <span className="to-viewAttachmentName">{file.name}</span>
                                                <span className="to-viewAttachmentSize">
                                                    {(file.size / 1024).toFixed(1)} KB
                                                </span>
                                                <span className="to-attachmentNewBadge">New</span>
                                                <button
                                                    type="button"
                                                    className="to-attachmentRemoveBtn"
                                                    onClick={() => handleRemoveNewFile(i)}
                                                    title="Remove this file"
                                                >
                                                    <FaTimes />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                <label htmlFor="editAttachments" className="to-editFileDrop">
                                    <FaPlus className="to-editFileDropIcon" />
                                    <span className="to-editFileDropText">Add attachment(s)</span>
                                    <input
                                        id="editAttachments"
                                        type="file"
                                        multiple
                                        onChange={handleNewFilesSelected}
                                        className="to-editFileInput"
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="to-modalFooter">
                            <button className="to-cancelBtn" onClick={closeEdit}>
                                Cancel
                            </button>
                            <button className="to-saveBtn" onClick={handleEditSave} disabled={savingEdit}>
                                <FaSave /> {savingEdit ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom delete confirmation popup — no window.confirm used */}
            {templateToDelete && (
                <div className="to-confirmOverlay" onClick={() => setTemplateToDelete(null)}>
                    <div className="to-confirmDialog" onClick={(e) => e.stopPropagation()}>
                        <div className="to-confirmIcon"><FaExclamationTriangle /></div>
                        <h3>Delete Template</h3>
                        <p>
                            Are you sure you want to delete{" "}
                            <strong>{templateToDelete.name}</strong>? This action cannot be undone.
                        </p>
                        <div className="to-confirmButtons">
                            <button
                                className="to-confirmCancel"
                                onClick={() => setTemplateToDelete(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="to-confirmDelete"
                                onClick={() => handleDelete(templateToDelete.templateId)}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Navbar>
    );
};

export default TemplatesOverview;