import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FaListUl, FaUsers, FaEye, FaPlus, FaTimes } from "react-icons/fa";
import Navbar from "../../../Components/Navbar/Navbar";
import CreateList from "./CreateList";
import "./ListsOverview.scss";

const ListsOverview = () => {
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);

    const fetchLists = async () => {
        setLoading(true);
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL}/lists`,
                { withCredentials: true }
            );
            setLists(res.data.lists);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to fetch lists");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLists();
    }, []);

    const handleListCreated = (newList) => {
        setLists((prev) => [newList, ...prev]);
        setShowCreateForm(false);
    };

    return (
        <Navbar>
            <div className="lo-main">
                <div className="lo-header">
                    <div className="lo-headerText">
                        <h2 className="lo-pageTitle"><FaListUl /> Lists</h2>
                        <p className="lo-pageSubtitle">Organize your contacts into groups for targeted campaigns</p>
                    </div>
                    <button
                        className={`lo-createToggleBtn ${showCreateForm ? "lo-createToggleBtn--active" : ""}`}
                        onClick={() => setShowCreateForm((prev) => !prev)}
                    >
                        {showCreateForm ? (<><FaTimes /> Close</>) : (<><FaPlus /> Create List</>)}
                    </button>
                </div>

                {showCreateForm && (
                    <div className="lo-createFormWrapper">
                        <CreateList onListCreated={handleListCreated} />
                    </div>
                )}

                <div className="lo-tableSection">
                    <div className="lo-tableSectionHeader">
                        <h3 className="lo-tableSectionTitle">All Lists</h3>
                        {!loading && lists.length > 0 && (
                            <span className="lo-tableCount">{lists.length}</span>
                        )}
                    </div>

                    {loading ? (
                        <div className="lo-loadingContainer">
                            <div className="lo-loadingSpinner"></div>
                            <p>Loading lists...</p>
                        </div>
                    ) : lists.length === 0 ? (
                        <div className="lo-emptyState">
                            <div className="lo-emptyIconWrap">
                                <FaUsers className="lo-emptyIcon" />
                            </div>
                            <h4 className="lo-emptyTitle">No lists yet</h4>
                            <p className="lo-emptyText">Create your first list to start organizing contacts.</p>
                            <button className="lo-emptyCta" onClick={() => setShowCreateForm(true)}>
                                <FaPlus /> Create List
                            </button>
                        </div>
                    ) : (
                        <div className="lo-tableWrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Description</th>
                                        <th>Contacts</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lists.map((list) => (
                                        <tr key={list.listId}>
                                            <td data-label="Name" className="lo-nameCell">{list.name}</td>
                                            <td data-label="Description" className="lo-descCell">{list.description || "—"}</td>
                                            <td data-label="Contacts">
                                                <span className="lo-contactCount">{list.contactCount}</span>
                                            </td>
                                            <td data-label="Actions">
                                                <Link className="lo-viewBtn" to={`/lists/${list.listId}`}>
                                                    <FaEye /> View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </Navbar>
    );
};

export default ListsOverview;