import { useState, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft, FaImage, FaSave, FaPaperclip, FaFileAlt } from "react-icons/fa";
import "./TemplateFillForm.scss";

// Injects the user's field values into the base template's placeholder tokens.
const renderPreview = (html, values) => {
    if (!html) return "";
    return html
        .replaceAll("{{heading}}", values.heading || "Your heading here")
        .replaceAll("{{bodyText}}", values.bodyText || "Your body text here")
        .replaceAll("{{buttonText}}", values.buttonText || "Click here")
        .replaceAll("{{buttonLink}}", values.buttonLink || "#")
        .replaceAll("{{imageUrl}}", values.imageUrl || "https://placehold.co/600x240?text=Your+Image");
};

const TemplateFillForm = ({ baseTemplate, onBack, onCreated }) => {
    const [name, setName] = useState(baseTemplate.name);
    const [subject, setSubject] = useState("");
    const [heading, setHeading] = useState("");
    const [bodyText, setBodyText] = useState("");
    const [buttonText, setButtonText] = useState("Learn More");
    const [buttonLink, setButtonLink] = useState("https://");
    const [imageUrl, setImageUrl] = useState("");
    const [uploadingImage, setUploadingImage] = useState(false);
    const [files, setFiles] = useState([]);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const needsImage = baseTemplate.html.includes("{{imageUrl}}");

    const previewHtml = useMemo(
        () => renderPreview(baseTemplate.html, { heading, bodyText, buttonText, buttonLink, imageUrl }),
        [baseTemplate.html, heading, bodyText, buttonText, buttonLink, imageUrl]
    );

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append("image", file);
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/templates/upload-image`,
                formData,
                {
                    withCredentials: true,
                    headers: { "Content-Type": "multipart/form-data" }
                }
            );
            setImageUrl(`${import.meta.env.VITE_API_URL}${res.data.imageUrl}`);
            toast.success("Image uploaded");
        } catch (error) {
            toast.error(error.response?.data?.message || "Image upload failed");
        } finally {
            setUploadingImage(false);
        }
    };

    const handleFileChange = (e) => {
        setFiles(Array.from(e.target.files));
    };

    const validate = () => {
        const newErrors = {};
        if (!name) newErrors.name = "Template name is required";
        if (!subject) newErrors.subject = "Subject is required";
        if (!heading) newErrors.heading = "Heading is required";
        if (!bodyText) newErrors.bodyText = "Body text is required";
        if (needsImage && !imageUrl) newErrors.imageUrl = "This template needs an image";
        return newErrors;
    };

    const handleSubmit = async () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error("Please fill in all required fields");
            return;
        }

        setSaving(true);
        try {
            const finalHtml = renderPreview(baseTemplate.html, {
                heading, bodyText, buttonText, buttonLink, imageUrl
            });

            const formData = new FormData();
            formData.append("name", name);
            formData.append("subject", subject);
            formData.append("html", finalHtml);
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
    };

    return (
        <div className="tf-wrapper">
            <button type="button" className="tf-backBtn" onClick={onBack}>
                <FaArrowLeft /> Back to templates
            </button>

            <div className="tf-layout">
                <div className="tf-formCol">
                    <h3 className="tf-formTitle">{baseTemplate.name}</h3>
                    <p className="tf-formSubtitle">Fill in the fields below - no HTML needed.</p>

                    <div className="tf-group">
                        <label className="tf-label">Template Name</label>
                        <input
                            className={`tf-input ${errors.name ? "error" : ""}`}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        {errors.name && <div className="tf-error">{errors.name}</div>}
                    </div>

                    <div className="tf-group">
                        <label className="tf-label">Subject Line</label>
                        <input
                            className={`tf-input ${errors.subject ? "error" : ""}`}
                            placeholder="What recipients see in their inbox"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                        {errors.subject && <div className="tf-error">{errors.subject}</div>}
                    </div>

                    {needsImage && (
                        <div className="tf-group">
                            <label className="tf-label">Banner Image</label>
                            <label htmlFor="tfImageInput" className="tf-fileDrop">
                                <FaImage className="tf-fileDropIcon" />
                                <span className="tf-fileDropText">
                                    {uploadingImage ? "Uploading..." : imageUrl ? "Image uploaded - click to replace" : "Click to upload an image"}
                                </span>
                                <input
                                    id="tfImageInput"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="tf-fileInput"
                                    disabled={uploadingImage}
                                />
                            </label>
                            {errors.imageUrl && <div className="tf-error">{errors.imageUrl}</div>}
                        </div>
                    )}

                    <div className="tf-group">
                        <label className="tf-label">Heading</label>
                        <input
                            className={`tf-input ${errors.heading ? "error" : ""}`}
                            placeholder="e.g. We've got something new for you"
                            value={heading}
                            onChange={(e) => setHeading(e.target.value)}
                        />
                        {errors.heading && <div className="tf-error">{errors.heading}</div>}
                    </div>

                    <div className="tf-group">
                        <label className="tf-label">Body Text</label>
                        <textarea
                            className={`tf-textarea ${errors.bodyText ? "error" : ""}`}
                            rows={5}
                            placeholder="Write your message here..."
                            value={bodyText}
                            onChange={(e) => setBodyText(e.target.value)}
                        />
                        {errors.bodyText && <div className="tf-error">{errors.bodyText}</div>}
                    </div>

                    <div className="tf-row">
                        <div className="tf-group">
                            <label className="tf-label">Button Text</label>
                            <input
                                className="tf-input"
                                value={buttonText}
                                onChange={(e) => setButtonText(e.target.value)}
                            />
                        </div>
                        <div className="tf-group">
                            <label className="tf-label">Button Link</label>
                            <input
                                className="tf-input"
                                value={buttonLink}
                                onChange={(e) => setButtonLink(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="tf-group">
                        <label htmlFor="tfAttachmentsInput" className="tf-label">Attachments (optional, max 5, 10MB each)</label>
                        <label htmlFor="tfAttachmentsInput" className="tf-fileDrop">
                            <FaPaperclip className="tf-fileDropIcon" />
                            <span className="tf-fileDropText">
                                {files.length > 0
                                    ? `${files.length} file${files.length > 1 ? "s" : ""} selected`
                                    : "Click to attach files"}
                            </span>
                            <input
                                id="tfAttachmentsInput"
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                className="tf-fileInput"
                            />
                        </label>

                        {files.length > 0 && (
                            <ul className="tf-fileList">
                                {files.map((f, i) => (
                                    <li key={i} className="tf-fileItem">
                                        <FaFileAlt className="tf-fileItemIcon" />
                                        <span className="tf-fileItemName">{f.name}</span>
                                        <span className="tf-fileItemSize">{(f.size / 1024).toFixed(1)} KB</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <button
                        type="button"
                        className="tf-saveBtn"
                        onClick={handleSubmit}
                        disabled={saving || uploadingImage}
                    >
                        <FaSave /> {saving ? "Creating..." : "Create Template"}
                    </button>
                </div>

                <div className="tf-previewCol">
                    <div className="tf-previewLabel">Live Preview</div>
                    <div className="tf-previewBox">
                        <iframe title="Live preview" srcDoc={previewHtml} className="tf-previewIframeFull" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TemplateFillForm;