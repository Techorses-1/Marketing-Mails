import { useState } from "react";
import axios from "axios";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import { FaPaperPlane, FaFileAlt, FaUsers, FaEnvelopeOpenText, FaPlus, FaTrash } from "react-icons/fa";
import "./CreateCampaign.scss";

const senderSchema = Yup.object({
    fromName: Yup.string().required("From name is required"),
    fromEmail: Yup.string().email("Invalid email").required("From email is required"),
    replyTo: Yup.string().email("Invalid email").required("Reply-To email is required")
});

const campaignSchema = Yup.object({
    name: Yup.string().required("Campaign name is required"),
    templateId: Yup.string(),
    subject: Yup.string(),
    html: Yup.string(),
    senderPool: Yup.array().of(senderSchema).min(1, "At least one sender is required"),
    listId: Yup.string().required("Please select a list")
});

// Embeddable form — rendered inside a toggle by CampaignsOverview.
// templates/lists are passed in from the parent (already fetched there);
// onCampaignCreated lets the parent close the form and refresh its table.
const CreateCampaign = ({ templates, lists, onCampaignCreated }) => {
    const initialValues = {
        name: "",
        templateId: "",
        subject: "",
        html: "",
        senderPool: [{ fromName: "", fromEmail: "", replyTo: "" }],
        listId: ""
    };

    const handleSubmit = async (values, { setSubmitting, resetForm }) => {
        try {
            // Don't send empty subject/html if a template is selected - let backend use template's content
            const payload = { ...values };
            if (payload.templateId) {
                if (!payload.subject) delete payload.subject;
                if (!payload.html) delete payload.html;
            }

            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/campaigns`,
                payload,
                { withCredentials: true }
            );

            toast.success(res.data.message || "Campaign created");
            resetForm();
            if (onCampaignCreated) onCampaignCreated(res.data.campaign);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create campaign");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="cc-card">
            <h2 className="cc-title"><FaPaperPlane /> Create Campaign</h2>
            <p className="cc-subtitle">Set up your email, choose recipients, and save it as a draft</p>

            <Formik
                initialValues={initialValues}
                validationSchema={campaignSchema}
                onSubmit={handleSubmit}
            >
                {({ isSubmitting, values }) => (
                    <Form className="cc-form">
                        <div className="cc-group">
                            <label className="cc-label" htmlFor="name">Campaign Name</label>
                            <Field className="cc-input" type="text" name="name" id="name" placeholder="e.g. October Newsletter" />
                            <ErrorMessage name="name" component="div" className="cc-error" />
                        </div>

                        <div className="cc-sectionDivider">
                            <FaFileAlt /> Content
                        </div>

                        <div className="cc-group">
                            <label className="cc-label" htmlFor="templateId">Use Template (optional)</label>
                            <Field as="select" className="cc-select" name="templateId" id="templateId">
                                <option value="">-- No template, write content below --</option>
                                {templates.map((t) => (
                                    <option key={t.templateId} value={t.templateId}>
                                        {t.name}
                                    </option>
                                ))}
                            </Field>
                        </div>

                        {!values.templateId && (
                            <>
                                <div className="cc-group">
                                    <label className="cc-label" htmlFor="subject">Subject</label>
                                    <Field className="cc-input" type="text" name="subject" id="subject" placeholder="Your email subject line" />
                                    <ErrorMessage name="subject" component="div" className="cc-error" />
                                </div>

                                <div className="cc-group">
                                    <label className="cc-label" htmlFor="html">HTML Content</label>
                                    <Field
                                        as="textarea"
                                        className="cc-textarea cc-textarea--code"
                                        name="html"
                                        id="html"
                                        rows={10}
                                        placeholder="<html>...</html>"
                                    />
                                    <ErrorMessage name="html" component="div" className="cc-error" />
                                </div>
                            </>
                        )}

                        <div className="cc-sectionDivider">
                            <FaEnvelopeOpenText /> Sender Pool
                        </div>
                        <p className="cc-helperText">
                            Add one or more senders. Sends are rotated round-robin across this pool.
                        </p>

                        <FieldArray name="senderPool">
                            {({ push, remove }) => (
                                <div className="cc-senderPool">
                                    {values.senderPool.map((sender, index) => (
                                        <div className="cc-senderCard" key={index}>
                                            <div className="cc-senderCardHeader">
                                                <span className="cc-senderCardTitle">Sender {index + 1}</span>
                                                {values.senderPool.length > 1 && (
                                                    <button
                                                        type="button"
                                                        className="cc-senderRemoveBtn"
                                                        onClick={() => remove(index)}
                                                    >
                                                        <FaTrash /> Remove
                                                    </button>
                                                )}
                                            </div>

                                            <div className="cc-group">
                                                <label className="cc-label" htmlFor={`senderPool.${index}.fromName`}>From Name</label>
                                                <Field
                                                    className="cc-input"
                                                    type="text"
                                                    name={`senderPool.${index}.fromName`}
                                                    id={`senderPool.${index}.fromName`}
                                                    placeholder="Techorses"
                                                />
                                                <ErrorMessage name={`senderPool.${index}.fromName`} component="div" className="cc-error" />
                                            </div>

                                            <div className="cc-row">
                                                <div className="cc-group">
                                                    <label className="cc-label" htmlFor={`senderPool.${index}.fromEmail`}>From Email</label>
                                                    <Field
                                                        className="cc-input"
                                                        type="email"
                                                        name={`senderPool.${index}.fromEmail`}
                                                        id={`senderPool.${index}.fromEmail`}
                                                        placeholder="news@techorses.com"
                                                    />
                                                    <ErrorMessage name={`senderPool.${index}.fromEmail`} component="div" className="cc-error" />
                                                </div>

                                                <div className="cc-group">
                                                    <label className="cc-label" htmlFor={`senderPool.${index}.replyTo`}>Reply-To Email</label>
                                                    <Field
                                                        className="cc-input"
                                                        type="email"
                                                        name={`senderPool.${index}.replyTo`}
                                                        id={`senderPool.${index}.replyTo`}
                                                        placeholder="hey@techorses.com"
                                                    />
                                                    <ErrorMessage name={`senderPool.${index}.replyTo`} component="div" className="cc-error" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        className="cc-addSenderBtn"
                                        onClick={() => push({ fromName: "", fromEmail: "", replyTo: "" })}
                                    >
                                        <FaPlus /> Add Sender
                                    </button>
                                </div>
                            )}
                        </FieldArray>

                        <div className="cc-sectionDivider">
                            <FaUsers /> Recipients
                        </div>

                        <div className="cc-group">
                            <label className="cc-label" htmlFor="listId">Send To List</label>
                            <Field as="select" className="cc-select" name="listId" id="listId">
                                <option value="">-- Select a list --</option>
                                {lists.map((l) => (
                                    <option key={l.listId} value={l.listId}>
                                        {l.name} ({l.contactCount} contacts)
                                    </option>
                                ))}
                            </Field>
                            <ErrorMessage name="listId" component="div" className="cc-error" />
                        </div>

                        <button type="submit" className="cc-submitBtn" disabled={isSubmitting}>
                            {isSubmitting ? "Creating..." : "Create Campaign (Draft)"}
                        </button>
                    </Form>
                )}
            </Formik>
        </div>
    );
};

export default CreateCampaign;