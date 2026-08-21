import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import "./AuthForm.scss";

const registerSchema = Yup.object({
    name: Yup.string().required("Name is required"),
    email: Yup.string().email("Invalid email").required("Email is required"),
    phone: Yup.string().required("Phone is required"),
    password: Yup.string().min(6, "Password must be at least 6 characters").required("Password is required")
});

const loginSchema = Yup.object({
    email: Yup.string().email("Invalid email").required("Email is required"),
    password: Yup.string().required("Password is required")
});

const AuthForm = () => {
    const navigate = useNavigate();
    const [isRegister, setIsRegister] = useState(false);

    const registerInitialValues = {
        name: "",
        email: "",
        phone: "",
        password: ""
    };

    const loginInitialValues = {
        email: "",
        password: ""
    };

    const handleSubmit = async (values, { setSubmitting, resetForm }) => {
        const endpoint = isRegister ? "register" : "login";
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/auth/${endpoint}`,
                values,
                { withCredentials: true }
            );
            toast.success(res.data.message || (isRegister ? "Registered successfully" : "Login successful"));
            resetForm();
            navigate("/dashboard");
        } catch (error) {
            toast.error(error.response?.data?.message || (isRegister ? "Registration failed" : "Login failed"));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="authForm">
            <div className="authForm__card">
                <h2 className="authForm__title">{isRegister ? "Register" : "Login"}</h2>
                <p className="authForm__subtitle">
                    {isRegister ? "Create an account to get started" : "Welcome back, please login to continue"}
                </p>

                <Formik
                    initialValues={isRegister ? registerInitialValues : loginInitialValues}
                    validationSchema={isRegister ? registerSchema : loginSchema}
                    onSubmit={handleSubmit}
                    enableReinitialize
                >
                    {({ isSubmitting }) => (
                        <Form className="authForm__form">
                            {isRegister && (
                                <div className="authForm__group">
                                    <label className="authForm__label" htmlFor="name">Name</label>
                                    <Field
                                        className="authForm__input"
                                        type="text"
                                        name="name"
                                        id="name"
                                        placeholder="Enter your name"
                                    />
                                    <ErrorMessage name="name" component="div" className="authForm__error" />
                                </div>
                            )}

                            <div className="authForm__group">
                                <label className="authForm__label" htmlFor="email">Email</label>
                                <Field
                                    className="authForm__input"
                                    type="email"
                                    name="email"
                                    id="email"
                                    placeholder="Enter your email"
                                />
                                <ErrorMessage name="email" component="div" className="authForm__error" />
                            </div>

                            {isRegister && (
                                <div className="authForm__group">
                                    <label className="authForm__label" htmlFor="phone">Phone</label>
                                    <Field
                                        className="authForm__input"
                                        type="text"
                                        name="phone"
                                        id="phone"
                                        placeholder="Enter your phone number"
                                    />
                                    <ErrorMessage name="phone" component="div" className="authForm__error" />
                                </div>
                            )}

                            <div className="authForm__group">
                                <label className="authForm__label" htmlFor="password">Password</label>
                                <Field
                                    className="authForm__input"
                                    type="password"
                                    name="password"
                                    id="password"
                                    placeholder="Enter your password"
                                />
                                <ErrorMessage name="password" component="div" className="authForm__error" />
                            </div>

                            <button
                                type="submit"
                                className="authForm__submitBtn"
                                disabled={isSubmitting}
                            >
                                {isSubmitting
                                    ? isRegister ? "Registering..." : "Logging in..."
                                    : isRegister ? "Register" : "Login"}
                            </button>
                        </Form>
                    )}
                </Formik>

                {/* <button
                    type="button"
                    className="authForm__toggleBtn"
                    onClick={() => setIsRegister(!isRegister)}
                >
                    {isRegister ? "Already have an account? Login" : "New here? Register"}
                </button> */}
            </div>
        </div>
    );
};

export default AuthForm;