import React from 'react';
import { i18n } from '../constants.js';

// --- SVG Icons for the About Page ---
const VisionIcon = () => React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-8 w-8", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" }),
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" })
);

const MissionIcon = () => React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-8 w-8", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 10V3L4 14h7v7l9-11h-7z" })
);

const StoryIcon = () => React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-8 w-8", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" })
);

const PrivacyIcon = () => React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-7 w-7", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 11c0 3.517-1.009 6.789-2.75 9.565C6.723 18.211 4 14.155 4 10V6a1 1 0 011-1h14a1 1 0 011 1v4c0 4.155-2.723 8.211-5.25 10.565C13.009 17.789 12 14.517 12 11z" })
);

const TransparencyIcon = () => React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-7 w-7", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" })
);

const ImprovementIcon = () => React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-7 w-7", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" })
);


const About = ({ language }) => {
    const t = i18n[language];

    const Section = ({ icon, title, children }) => (
        React.createElement('section', { className: "mb-8" },
            React.createElement('div', { className: "flex items-center gap-4 mb-3" },
                React.createElement('div', { className: "text-brand-red" }, icon),
                React.createElement('h3', { className: "text-2xl font-bold text-slate-900 dark:text-brand-text" }, title)
            ),
            React.createElement('div', { className: `border-brand-red/30 ${language === 'ar' ? 'border-r-2 pr-6 mr-4' : 'border-l-2 pl-6 ml-4'}` }, children)
        )
    );
    
    const ValueItem = ({ icon, title, description }) => (
        React.createElement('div', { className: "text-center" },
            React.createElement('div', { className: "flex justify-center items-center h-16 w-16 mx-auto mb-3 rounded-full bg-brand-red/10 text-brand-red border border-brand-red/30" }, icon),
            React.createElement('h4', { className: "text-lg font-semibold text-slate-900 dark:text-brand-text" }, title),
            React.createElement('p', { className: "text-sm" }, description)
        )
    );

    return React.createElement('div', { className: "max-w-4xl mx-auto py-8 px-4" },
        React.createElement('div', { className: "text-center mb-12" },
            React.createElement('h2', { className: "text-4xl font-extrabold text-slate-900 dark:text-brand-text" }, t.aboutTitle)
        ),

        React.createElement('div', { className: "bg-white dark:bg-card-gradient p-8 rounded-2xl border border-slate-200 dark:border-white/10 space-y-6 text-lg leading-relaxed text-slate-600 dark:text-brand-text-light" },
            React.createElement(Section, { icon: React.createElement(VisionIcon), title: t.aboutVisionTitle },
                React.createElement('p', null, t.aboutVisionText)
            ),
            React.createElement(Section, { icon: React.createElement(MissionIcon), title: t.aboutMissionTitle },
                React.createElement('p', null, t.aboutMissionText)
            ),
            React.createElement('section', { className: "mb-8 text-center" },
                 React.createElement('h3', { className: "text-2xl font-bold text-slate-900 dark:text-brand-text mb-6" }, t.aboutValuesTitle),
                 React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-3 gap-8" },
                    React.createElement(ValueItem, { icon: React.createElement(PrivacyIcon), title: t.aboutValuePrivacy, description: t.aboutValuePrivacyDesc }),
                    React.createElement(ValueItem, { icon: React.createElement(TransparencyIcon), title: t.aboutValueTransparency, description: t.aboutValueTransparencyDesc }),
                    React.createElement(ValueItem, { icon: React.createElement(ImprovementIcon), title: t.aboutValueImprovement, description: t.aboutValueImprovementDesc })
                 )
            ),
            React.createElement(Section, { icon: React.createElement(StoryIcon), title: t.aboutStoryTitle },
                React.createElement('p', null, t.aboutStoryText)
            )
        )
    );
};

export default About;