import { useState, useRef, useEffect } from "react";
import "../../styles/ExpandableText.css";

type ExpandableTextProps = {
    text: string;
};

export function ExpandableText({ text }: ExpandableTextProps) {
    const [expanded, setExpanded] = useState(false);
    const [shouldShowFade, setShouldShowFade] = useState(false);
    const textRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = textRef.current;
        if (el) {
            const overflows = el.scrollHeight > el.clientHeight + 1;
            setShouldShowFade(!expanded && overflows);
        }
    }, [text, expanded]);

    const toggleExpand = () => setExpanded(prev => !prev);

    return (
        <div className="expandable-text" onClick={toggleExpand}>
            <div
                ref={textRef}
                className={`text-content ${expanded ? "expanded" : "collapsed"}`}
            >
                {text}
            </div>
            {shouldShowFade && <div className="gradient-overlay" />}
        </div>
    );
}
