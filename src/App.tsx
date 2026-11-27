import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ApplicantDashboardPage } from './pages/ApplicantDashboardPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { DocumentReviewWorkspacePage } from './pages/DocumentReviewWorkspacePage';
import { DocumentsPage } from './pages/DocumentsPage';
import { EditorDashboardPage } from './pages/EditorDashboardPage';
import { HomePage } from './pages/HomePage';
import { InternshipsPage } from './pages/InternshipsPage';
import { OpportunityDetailPage } from './pages/OpportunityDetailPage';
import { CategoriesPage, RegionsPage } from './pages/RegionsCategoriesPages';
import { AboutPage, ContactPage, PrivacyPolicyPage, TermsPage } from './pages/StaticPages';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/internships" element={<InternshipsPage />} />
            <Route path="/internships/:id" element={<OpportunityDetailPage />} />
            <Route path="/regions" element={<RegionsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<ApplicantDashboardPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/reviews/:id" element={<DocumentReviewWorkspacePage />} />
            <Route path="/editor" element={<EditorDashboardPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}
