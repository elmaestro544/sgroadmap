import React from 'react';

export const Spinner = ({ size = '8' }) => (
  <div
    className={`animate-spin rounded-full h-${size} w-${size} border-b-2 border-t-2 border-brand-red`}
  ></div>
);

export const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-brand-text-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

export const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 12h14" />
    </svg>
);

export const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

export const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

export const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

export const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const GoogleIcon = () => (
    <svg className="w-5 h-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
        <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 111.8 512 0 398.9 0 261.8 0 124.9 111.8 12.8 244 12.8c70.3 0 129.5 27.8 175.2 72.9l-68.5 68.5c-24.1-22.9-57-37.1-97.2-37.1-72.5 0-132.3 58.9-132.3 131.5s59.8 131.5 132.3 131.5c83.8 0 116.3-59.5 121.2-88.5H244v-83.8h236.1c2.4 12.8 3.9 26.6 3.9 41.5z"></path>
    </svg>
);

export const GithubIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.168 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
    </svg>
);

export const LinkedinIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
    </svg>
);

export const FacebookIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.323-1.325z"/>
    </svg>
);

export const TelegramIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M24 12c0 6.627-5.373 12-12 12s-12-5.373-12-12 5.373-12 12-12 12 5.373 12 12zm-1.282-2.15l-3.321 12.87-4.088-2.585-1.425 2.062-2.14-1.583 3.125-4.495-4.942-3.332 14.81-5.001zm-4.832 9.15l2.69-10.362-11.232 7.159 3.12 1.812 5.422 1.391z"/>
    </svg>
);

export const Logo = () => (
    <svg
        viewBox="0 0 325 325"
        xmlns="http://www.w3.org/2000/svg"
        className="h-10 w-auto"
        aria-label="SciGenius Logo"
        role="img"
    >
        <title>SciGenius Logo - a human head silhouette split into a human side and a machine side</title>
        <g stroke="#f8fafc" strokeWidth="16" strokeLinejoin="round" strokeMiterlimit="10">
            {/* Left side (human) */}
            <path
                d="M162.5 8.5 C 138.8 8.5, 115.1 21.6, 99.2 46.1 C 83.3 70.6, 75.2 96.5, 78.4 125.1 C 79.1 130.8, 77.8 136.2, 72.7 138.6 C 63.8 142.9, 70.3 154.5, 74.2 163.4 C 77.3 170.6, 82.8 176.4, 90.1 179.3 C 95.2 181.4, 98.2 187.3, 97.4 192.9 C 95.2 208.2, 81.3 223.1, 79.9 240.2 C 78.5 257.3, 90.1 278.4, 105.1 295.8 C 117.6 309.9, 129.2 316.5, 129.2 316.5 H 162.5 V 8.5 Z"
                fill="#00205B"
            />
            {/* Right side (machine) */}
            <path
                d="M162.5 8.5C246.8 8.5 316.5 78.2 316.5 162.5C316.5 246.8 246.8 316.5 162.5 316.5V8.5Z"
                fill="#ef4444"
            />
        </g>
        
        {/* Circuits on right side (drawn on top of the base) */}
        <g stroke="#f8fafc" strokeWidth="12" strokeLinecap="round">
            <line x1="162.5" y1="100" x2="230" y2="100" />
            <line x1="162.5" y1="162.5" x2="230" y2="162.5" />
            <line x1="162.5" y1="225" x2="230" y2="225" />
        </g>
        
        <g stroke="#f8fafc" strokeWidth="12">
            {/* Top hollow circle */}
            <circle cx="250" cy="100" r="15" fill="#ef4444" />
            {/* Middle hollow circle */}
            <circle cx="250" cy="162.5" r="15" fill="#ef4444" />
        </g>
        {/* Bottom solid circle - drawn separately to have no stroke */}
        <circle cx="250" cy="225" r="15" fill="#f8fafc" stroke="none" />
    </svg>
);