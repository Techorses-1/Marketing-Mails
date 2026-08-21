import axios from "axios";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import { FaUserPlus } from "react-icons/fa";
import "./AddContact.scss";

const contactSchema = Yup.object({
    email: Yup.string().email("Invalid email").required("Email is required"),
    firstName: Yup.string(),
    lastName: Yup.string(),
    company: Yup.string(),
    phone: Yup.string()
});

// Embeddable form — rendered inside a modal by the parent (e.g. ListContacts).
// listId is passed in from context; onContactAdded lets the parent refresh
// its contact list and/or close the modal.
const AddContact = ({ listId, onContactAdded }) => {
    const initialValues = {
        email: "",
        firstName: "",
        lastName: "",
        company: "",
        phone: ""
    };

    const handleSubmit = async (values, { setSubmitting, resetForm }) => {
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/contacts`,
                { ...values, listId },
                { withCredentials: true }
            );

            const { addedToList, contact } = res.data;

            // Give a specific, honest message depending on what actually happened -
            // "success" every time regardless of outcome is misleading UX
            if (listId && !addedToList) {
                toast.info(
                    contact?.status && ["UNSUBSCRIBED", "BOUNCED", "COMPLAINED", "INVALID"].includes(contact.status)
                        ? `${contact.email} is suppressed (${contact.status.toLowerCase()}) and was not added to this list`
                        : `${contact.email} is already in this list`
                );
            } else {
                toast.success(res.data.message || "Contact added");
            }

            resetForm();
            if (onContactAdded) onContactAdded(contact);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to add contact");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="ac-card">
            <h3 className="ac-title"><FaUserPlus /> Add Contact</h3>
            <p className="ac-subtitle">Add a single contact manually to this list</p>

            <Formik
                initialValues={initialValues}
                validationSchema={contactSchema}
                onSubmit={handleSubmit}
            >
                {({ isSubmitting }) => (
                    <Form className="ac-form">
                        <div className="ac-group">
                            <label className="ac-label" htmlFor="email">Email</label>
                            <Field className="ac-input" type="email" name="email" id="email" placeholder="john.doe@example.com" />
                            <ErrorMessage name="email" component="div" className="ac-error" />
                        </div>

                        <div className="ac-row">
                            <div className="ac-group">
                                <label className="ac-label" htmlFor="firstName">First Name</label>
                                <Field className="ac-input" type="text" name="firstName" id="firstName" />
                                <ErrorMessage name="firstName" component="div" className="ac-error" />
                            </div>

                            <div className="ac-group">
                                <label className="ac-label" htmlFor="lastName">Last Name</label>
                                <Field className="ac-input" type="text" name="lastName" id="lastName" />
                                <ErrorMessage name="lastName" component="div" className="ac-error" />
                            </div>
                        </div>

                        <div className="ac-row">
                            <div className="ac-group">
                                <label className="ac-label" htmlFor="company">Company</label>
                                <Field className="ac-input" type="text" name="company" id="company" />
                                <ErrorMessage name="company" component="div" className="ac-error" />
                            </div>

                            <div className="ac-group">
                                <label className="ac-label" htmlFor="phone">Phone</label>
                                <Field className="ac-input" type="text" name="phone" id="phone" />
                                <ErrorMessage name="phone" component="div" className="ac-error" />
                            </div>
                        </div>

                        <button type="submit" className="ac-submitBtn" disabled={isSubmitting}>
                            {isSubmitting ? "Adding..." : "Add Contact"}
                        </button>
                    </Form>
                )}
            </Formik>
        </div>
    );
};

export default AddContact;