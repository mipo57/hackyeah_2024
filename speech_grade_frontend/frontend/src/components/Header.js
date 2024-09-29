import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Header() {
    const location = useLocation();

    return (
        <header className="bg-white border-b border-gray-200">
            <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                    <div className="flex items-center">
                        <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <h1 className="ml-2 text-xl font-semibold text-gray-800">SłowoMistrz</h1>
                    </div>
                    <nav className="hidden md:flex space-x-8">
                        <Link to="/" className={`text-gray-600 hover:text-gray-900 font-medium ${location.pathname === '/' ? 'text-emerald-500' : ''}`}>
                            Analiza Wideo
                        </Link>
                        <Link to="/library" className={`text-gray-600 hover:text-gray-900 font-medium ${location.pathname === '/library' ? 'text-emerald-500' : ''}`}>
                            Biblioteka
                        </Link>
                    </nav>
                    <div className="flex items-center">
                        <button className="bg-emerald-500 text-white px-4 py-2 rounded-md font-medium hover:bg-emerald-600 transition duration-150 ease-in-out">
                            Nowy Projekt
                        </button>
                        <button className="ml-4 text-gray-500 hover:text-gray-700">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;