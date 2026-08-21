import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
    FaFileUpload, FaFileCsv, FaCheckCircle,
    FaListUl, FaLayerGroup, FaExclamationCircle,
    FaUserPlus, FaUserCheck, FaDownload
} from "react-icons/fa";
import "./ImportContacts.scss";

// Embeddable form — rendered inside a modal by the parent (e.g. ListContacts).
// listId is passed in from context; onImportComplete lets the parent refresh
// its contact list once the import result comes back.
const ImportContacts = ({ listId, onImportComplete }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    // Generates and downloads a sample CSV template with the correct columns
    const handleDownloadTemplate = () => {
        const headers = "email,firstName,lastName,company,phone";
        const sampleRows = [
            "john.doe@example.com,John,Doe,Acme Inc,9876543210",
            "jane.smith@example.com,Jane,Smith,Tech Corp,9123456780"
        ];
        const csvContent = [headers, ...sampleRows].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "contacts_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!file) {
            toast.error("Please select a file first");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("listId", listId);

        setUploading(true);
        setResult(null);

        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/contacts/import`,
                formData,
                {
                    withCredentials: true,
                    headers: { "Content-Type": "multipart/form-data" }
                }
            );
            toast.success(res.data.message || "Import completed");
            setResult(res.data.result);
            if (onImportComplete) onImportComplete(res.data.result);
        } catch (error) {
            toast.error(error.response?.data?.message || "Import failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="ic-card">
            <h3 className="ic-title"><FaFileUpload /> Import Contacts</h3>
            <p className="ic-subtitle">Upload a CSV or Excel file to add contacts to this list</p>

            <button
                type="button"
                className="ic-templateBtn"
                onClick={handleDownloadTemplate}
            >
                <FaDownload /> Download Template
            </button>

            <form className="ic-form" onSubmit={handleUpload}>
                <div className="ic-group">
                    <label className="ic-label" htmlFor="importFile">Select CSV or Excel File</label>

                    <label htmlFor="importFile" className="ic-fileDrop">
                        <FaFileCsv className="ic-fileDropIcon" />
                        <span className="ic-fileDropText">
                            {file ? file.name : "Click to choose a file"}
                        </span>
                        <span className="ic-fileDropHint">.csv, .xlsx, .xls</span>
                        <input
                            id="importFile"
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFileChange}
                            className="ic-fileInput"
                        />
                    </label>
                </div>

                <button
                    type="submit"
                    className="ic-uploadBtn"
                    disabled={uploading}
                >
                    {uploading ? "Uploading..." : "Upload & Import"}
                </button>
            </form>

            {result && (
                <div className="ic-result">
                    <h4 className="ic-resultTitle"><FaCheckCircle /> Import Result</h4>
                    <div className="ic-resultGrid">
                        <div className="ic-resultItem">
                            <FaListUl className="ic-resultIcon" />
                            <span className="ic-resultValue">{result.totalRows}</span>
                            <span className="ic-resultLabel">Total Rows</span>
                        </div>
                        <div className="ic-resultItem ic-resultItem--success">
                            <FaCheckCircle className="ic-resultIcon" />
                            <span className="ic-resultValue">{result.valid}</span>
                            <span className="ic-resultLabel">Valid</span>
                        </div>
                        <div className="ic-resultItem ic-resultItem--warning">
                            <FaLayerGroup className="ic-resultIcon" />
                            <span className="ic-resultValue">{result.duplicateInFile}</span>
                            <span className="ic-resultLabel">Duplicate in File</span>
                        </div>
                        <div className="ic-resultItem ic-resultItem--danger">
                            <FaExclamationCircle className="ic-resultIcon" />
                            <span className="ic-resultValue">{result.invalid}</span>
                            <span className="ic-resultLabel">Invalid</span>
                        </div>
                        <div className="ic-resultItem ic-resultItem--success">
                            <FaUserPlus className="ic-resultIcon" />
                            <span className="ic-resultValue">{result.addedToList}</span>
                            <span className="ic-resultLabel">Added to List</span>
                        </div>
                        <div className="ic-resultItem">
                            <FaUserCheck className="ic-resultIcon" />
                            <span className="ic-resultValue">{result.alreadyInList}</span>
                            <span className="ic-resultLabel">Already in List</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImportContacts;