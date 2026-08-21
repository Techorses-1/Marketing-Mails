import { useState } from "react";
import axios from "axios";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import "./CreateList.scss";

const listSchema = Yup.object({
    name: Yup.string().required("List name is required"),
    description: Yup.string()
});

const CreateList = ({ onListCreated }) => {
    const initialValues = { name: "", description: "" };

    const handleSubmit = async (values, { setSubmitting, resetForm }) => {
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/lists`,
                values,
                { withCredentials: true }
            );
            toast.success(res.data.message || "List created");
            resetForm();
            if (onListCreated) onListCreated(res.data.list);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create list");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="cl-card">
            <h3 className="cl-title">Create New List</h3>
            <p className="cl-subtitle">Group your contacts together under a new list</p>

            <Formik
                initialValues={initialValues}
                validationSchema={listSchema}
                onSubmit={handleSubmit}
            >
                {({ isSubmitting }) => (
                    <Form className="cl-form">
                        <div className="cl-group">
                            <label className="cl-label" htmlFor="name">List Name</label>
                            <Field
                                className="cl-input"
                                type="text"
                                name="name"
                                id="name"
                                placeholder="e.g. Newsletter Subscribers"
                            />
                            <ErrorMessage name="name" component="div" className="cl-error" />
                        </div>

                        <div className="cl-group">
                            <label className="cl-label" htmlFor="description">Description</label>
                            <Field
                                as="textarea"
                                className="cl-textarea"
                                name="description"
                                id="description"
                                placeholder="What is this list for? (optional)"
                                rows={4}
                            />
                            <ErrorMessage name="description" component="div" className="cl-error" />
                        </div>

                        <button
                            type="submit"
                            className="cl-submitBtn"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Creating..." : "Create List"}
                        </button>
                    </Form>
                )}
            </Formik>
        </div>
    );
};

export default CreateList;