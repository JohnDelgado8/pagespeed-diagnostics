// components/Layout.tsx
import React, { ReactNode } from 'react';
import Navbar from './Navbar';

type LayoutProps = {
  children: ReactNode;
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="container mx-auto p-4 pt-20"> {/* Added pt-20 for fixed navbar */}
        {children}
      </main>
      <footer className="text-center p-4 text-gray-600 text-sm">
        PageSpeed Diagnostics by John Delgado © {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default Layout;