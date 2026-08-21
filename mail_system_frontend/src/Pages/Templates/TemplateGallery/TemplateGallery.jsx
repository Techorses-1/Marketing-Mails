import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowRight, FaThLarge } from "react-icons/fa";
import "./TemplateGallery.scss";

// Fixed reference width the base template HTML is designed at (matches the
// 600px table width used across all baseTemplates.js templates).
const DESIGN_WIDTH = 600;
const DESIGN_HEIGHT = 1000;

// Renders one template's preview, scaled to exactly fill its container width
// (measured live via ResizeObserver) so it's always centered/edge-to-edge -
// no more guessing a fixed scale factor that only worked for one card width.
const TemplatePreviewFrame = ({ name, html }) => {
    const frameRef = useRef(null);
    const [scale, setScale] = useState(0);

    useEffect(() => {
        const el = frameRef.current;
        if (!el) return;

        const updateScale = () => {
            const width = el.clientWidth;
            if (width > 0) setScale(width / DESIGN_WIDTH);
        };

        updateScale();

        const observer = new ResizeObserver(updateScale);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div className="tg-previewFrame" ref={frameRef}>
            {scale > 0 && (
                <iframe
                    title={name}
                    srcDoc={html}
                    className="tg-previewIframe"
                    scrolling="no"
                    style={{
                        width: `${DESIGN_WIDTH}px`,
                        height: `${DESIGN_HEIGHT}px`,
                        transform: `scale(${scale})`
                    }}
                />
            )}
        </div>
    );
};

// Shows a preview grid of pre-designed base templates (Option 3).
// User picks one, then moves on to the fill-in form (heading/body/button/image).
const TemplateGallery = ({ onSelect }) => {
    const [baseTemplates, setBaseTemplates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBaseTemplates = async () => {
            try {
                const res = await axios.get(
                    `${import.meta.env.VITE_API_URL}/templates/base`,
                    { withCredentials: true }
                );
                setBaseTemplates(res.data.baseTemplates);
            } catch (error) {
                toast.error(error.response?.data?.message || "Failed to load templates");
            } finally {
                setLoading(false);
            }
        };
        fetchBaseTemplates();
    }, []);

    if (loading) {
        return (
            <div className="tg-loadingContainer">
                <div className="tg-loadingSpinner"></div>
                <p>Loading templates...</p>
            </div>
        );
    }

    return (
        <div className="tg-gallery">
            <div className="tg-galleryHeader">
                <FaThLarge />
                <span>Choose a template to start with</span>
            </div>

            <div className="tg-grid">
                {baseTemplates.map((template) => (
                    <div key={template.id} className="tg-card">
                        <TemplatePreviewFrame name={template.name} html={template.html} />
                        <div className="tg-cardBody">
                            <h4 className="tg-cardTitle">{template.name}</h4>
                            <p className="tg-cardDescription">{template.description}</p>
                            <button
                                type="button"
                                className="tg-selectBtn"
                                onClick={() => onSelect(template)}
                            >
                                Use this template <FaArrowRight />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TemplateGallery;