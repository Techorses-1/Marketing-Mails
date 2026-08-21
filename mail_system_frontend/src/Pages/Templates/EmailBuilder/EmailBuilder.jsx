import { useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import EmailEditor from "react-email-editor";
import { FaSave, FaPaperclip, FaFileAlt } from "react-icons/fa";
import "./EmailBuilder.scss";

// Drag-and-drop email design builder (Option 1). Uses Unlayer's editor via
// react-email-editor - the editor itself outputs email-safe HTML (table-based,
// inline styles) so nothing special needs to happen on our side, we just take
// whatever HTML it exports and save it as a normal Template.
//
// NOTE: requires `npm install react-email-editor` in the client project.
const EmailBuilder = ({ onCreated }) => {
    const emailEditorRef = useRef(null);
    const [name, setName] = useState("");
    const [subject, setSubject] = useState("");
    const [files, setFiles] = useState([]);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [editorReady, setEditorReady] = useState(false);

    const onEditorLoad = () => {
        setEditorReady(true);
    };

    const handleFileChange = (e) => {
        setFiles(Array.from(e.target.files));
    };

    const validate = () => {
        const newErrors = {};
        if (!name) newErrors.name = "Template name is required";
        if (!subject) newErrors.subject = "Subject is required";
        return newErrors;
    };

    const handleSave = () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error("Please fill in the name and subject before saving");
            return;
        }

        if (!emailEditorRef.current) {
            toast.error("Editor is not ready yet");
            return;
        }

        setSaving(true);

        emailEditorRef.current.editor.exportHtml(async (data) => {
            const { html } = data;

            try {
                const formData = new FormData();
                formData.append("name", name);
                formData.append("subject", subject);
                formData.append("html", html);
                formData.append("text", "");
                files.forEach((file) => {
                    formData.append("attachments", file);
                });

                const res = await axios.post(
                    `${import.meta.env.VITE_API_URL}/templates`,
                    formData,
                    {
                        withCredentials: true,
                        headers: { "Content-Type": "multipart/form-data" }
                    }
                );

                toast.success(res.data.message || "Template created");
                if (onCreated) onCreated(res.data.template);
            } catch (error) {
                toast.error(error.response?.data?.message || "Failed to create template");
            } finally {
                setSaving(false);
            }
        });
    };

    return (
        <div className="eb-wrapper">
            <div className="eb-topBar">
                <div className="eb-group">
                    <label className="eb-label">Template Name</label>
                    <input
                        className={`eb-input ${errors.name ? "error" : ""}`}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Custom Promo Design"
                    />
                </div>
                <div className="eb-group">
                    <label className="eb-label">Subject</label>
                    <input
                        className={`eb-input ${errors.subject ? "error" : ""}`}
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Email subject line"
                    />
                </div>
                <button
                    type="button"
                    className="eb-saveBtn"
                    onClick={handleSave}
                    disabled={saving || !editorReady}
                >
                    <FaSave /> {saving ? "Saving..." : "Save Template"}
                </button>
            </div>

            <div className="eb-attachRow">
                <label htmlFor="ebAttachmentsInput" className="eb-label">Attachments (optional, max 5, 10MB each)</label>
                <label htmlFor="ebAttachmentsInput" className="eb-fileDrop">
                    <FaPaperclip className="eb-fileDropIcon" />
                    <span className="eb-fileDropText">
                        {files.length > 0
                            ? `${files.length} file${files.length > 1 ? "s" : ""} selected`
                            : "Click to attach files"}
                    </span>
                    <input
                        id="ebAttachmentsInput"
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="eb-fileInput"
                    />
                </label>

                {files.length > 0 && (
                    <ul className="eb-fileList">
                        {files.map((f, i) => (
                            <li key={i} className="eb-fileItem">
                                <FaFileAlt className="eb-fileItemIcon" />
                                <span className="eb-fileItemName">{f.name}</span>
                                <span className="eb-fileItemSize">{(f.size / 1024).toFixed(1)} KB</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="eb-editorContainer">
                <EmailEditor ref={emailEditorRef} onLoad={onEditorLoad} minHeight="600px" />
            </div>
        </div>
    );
};

export default EmailBuilder;