import { useState } from "react";
import axios from "axios";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import { FaFileCode, FaPaperclip, FaFileAlt, FaThLarge, FaMagic, FaCode } from "react-icons/fa";
import TemplateGallery from "./TemplateGallery/TemplateGallery";
import TemplateFillForm from "./TemplateForm/TemplateFillForm";
import EmailBuilder from "./EmailBuilder/EmailBuilder";
import "./CreateTemplate.scss";

const templateSchema = Yup.object({
    name: Yup.string().required("Template name is required"),
    subject: Yup.string().required("Subject is required"),
    html: Yup.string().required("HTML content is required"),
    text: Yup.string()
});

// Raw HTML form - kept as-is for technical users who want full control.
const WriteHtmlForm = ({ onTemplateCreated }) => {
    const [files, setFiles] = useState([]);
    const initialValues = { name: "", subject: "", html: "", text: "" };

    const handleFileChange = (e) => {
        setFiles(Array.from(e.target.files));
    };

    const handleSubmit = async (values, { setSubmitting, resetForm }) => {
        try {
            const formData = new FormData();
            formData.append("name", values.name);
            formData.append("subject", values.subject);
            formData.append("html", values.html);
            formData.append("text", values.text);
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
            resetForm();
            setFiles([]);
            if (onTemplateCreated) onTemplateCreated(res.data.template);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create template");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Formik
            initialValues={initialValues}
            validationSchema={templateSchema}
            onSubmit={handleSubmit}
        >
            {({ isSubmitting }) => (
                <Form className="ct-form">
                    <div className="ct-group">
                        <label className="ct-label" htmlFor="name">Template Name</label>
                        <Field className="ct-input" type="text" name="name" id="name" placeholder="e.g. Welcome Email" />
                        <ErrorMessage name="name" component="div" className="ct-error" />
                    </div>

                    <div className="ct-group">
                        <label className="ct-label" htmlFor="subject">Subject</label>
                        <Field className="ct-input" type="text" name="subject" id="subject" placeholder="Email subject line" />
                        <ErrorMessage name="subject" component="div" className="ct-error" />
                    </div>

                    <div className="ct-group">
                        <label className="ct-label" htmlFor="html">HTML Content</label>
                        <Field
                            as="textarea"
                            className="ct-textarea ct-textarea--code"
                            name="html"
                            id="html"
                            rows={10}
                            placeholder="<html>...</html>"
                        />
                        <ErrorMessage name="html" component="div" className="ct-error" />
                    </div>

                    <div className="ct-group">
                        <label className="ct-label" htmlFor="text">Plain Text (optional)</label>
                        <Field
                            as="textarea"
                            className="ct-textarea"
                            name="text"
                            id="text"
                            rows={5}
                            placeholder="Plain text fallback for this email"
                        />
                        <ErrorMessage name="text" component="div" className="ct-error" />
                    </div>

                    <div className="ct-group">
                        <label htmlFor="attachments" className="ct-label">Attachments (max 5, 10MB each)</label>

                        <label htmlFor="attachments" className="ct-fileDrop">
                            <FaPaperclip className="ct-fileDropIcon" />
                            <span className="ct-fileDropText">
                                {files.length > 0
                                    ? `${files.length} file${files.length > 1 ? "s" : ""} selected`
                                    : "Click to attach files"}
                            </span>
                            <input
                                id="attachments"
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                className="ct-fileInput"
                            />
                        </label>

                        {files.length > 0 && (
                            <ul className="ct-fileList">
                                {files.map((f, i) => (
                                    <li key={i} className="ct-fileItem">
                                        <FaFileAlt className="ct-fileItemIcon" />
                                        <span className="ct-fileItemName">{f.name}</span>
                                        <span className="ct-fileItemSize">{(f.size / 1024).toFixed(1)} KB</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <button type="submit" className="ct-submitBtn" disabled={isSubmitting}>
                        {isSubmitting ? "Creating..." : "Create Template"}
                    </button>
                </Form>
            )}
        </Formik>
    );
};

const CreateTemplate = ({ onTemplateCreated }) => {
    // 'html' = write raw HTML (advanced/technical users)
    // 'gallery' = pick a pre-designed template and fill in simple fields (Option 3)
    // 'builder' = drag-and-drop design from scratch (Option 1)
    const [mode, setMode] = useState("gallery");
    const [selectedBaseTemplate, setSelectedBaseTemplate] = useState(null);

    const handleCreated = (template) => {
        setSelectedBaseTemplate(null);
        if (onTemplateCreated) onTemplateCreated(template);
    };

    const switchMode = (newMode) => {
        setMode(newMode);
        setSelectedBaseTemplate(null);
    };

    return (
        <div className="ct-card">
            <h3 className="ct-title"><FaFileCode /> Create Template</h3>
            <p className="ct-subtitle">Build a reusable email template - pick the way that works best for you</p>

            <div className="ct-modeTabs">
                <button
                    type="button"
                    className={`ct-modeTab ${mode === "gallery" ? "active" : ""}`}
                    onClick={() => switchMode("gallery")}
                >
                    <FaThLarge /> Use a Ready Template
                </button>
                <button
                    type="button"
                    className={`ct-modeTab ${mode === "builder" ? "active" : ""}`}
                    onClick={() => switchMode("builder")}
                >
                    <FaMagic /> Design from Scratch
                </button>
                <button
                    type="button"
                    className={`ct-modeTab ${mode === "html" ? "active" : ""}`}
                    onClick={() => switchMode("html")}
                >
                    <FaCode /> Write HTML
                </button>
            </div>

            <div className="ct-modeContent">
                {mode === "gallery" && !selectedBaseTemplate && (
                    <TemplateGallery onSelect={setSelectedBaseTemplate} />
                )}

                {mode === "gallery" && selectedBaseTemplate && (
                    <TemplateFillForm
                        baseTemplate={selectedBaseTemplate}
                        onBack={() => setSelectedBaseTemplate(null)}
                        onCreated={handleCreated}
                    />
                )}

                {mode === "builder" && (
                    <EmailBuilder onCreated={handleCreated} />
                )}

                {mode === "html" && (
                    <WriteHtmlForm onTemplateCreated={handleCreated} />
                )}
            </div>
        </div>
    );
};

export default CreateTemplate;