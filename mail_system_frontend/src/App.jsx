import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";


import AdminUsers from './Pages/Authentication/Admin/AdminUsers';

import ProtectedRoute from './Components/Protected/ProtectedRoute';
import PermissionRoute from './Components/Protected/PermissionRoute';
import AuthForm from "./Pages/Authentication/AuthForm";
import Home from "./Pages/Home/Home";
import ListsOverview from "./Pages/Contact/List/ListsOverview";
import CreateCampaign from "./Pages/Campaign/CreateCampaign";
import CampaignDetail from "./Pages/Campaign/CampaignDetail/CampaignDetail";
import TemplatesOverview from "./Pages/Templates/Overview/TemplatesOverview";
import ListContacts from "./Pages/Contact/ListContacts/ListContacts";
import ImportContacts from "./Pages/Contact/ImportContact/ImportContacts";
import CampaignRecipients from "./Pages/Campaign/RecipientsInfo/CampaignRecipients";
import CampaignsOverview from "./Pages/Campaign/Overview/CampaignsOverview";



function App() {
  return (
    <BrowserRouter>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        <div style={{ flex: 1 }}>
          <Routes>
            {/* ===== PUBLIC ROUTES ===== */}
            <Route path="/login" element={<AuthForm />} />

            {/* ===== PROTECTED ROUTES ===== */}

            <Route path="/" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />

            <Route path="/lists" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="contacts">
                  <ListsOverview />
                </PermissionRoute>
              </ProtectedRoute>
            } />

            <Route path="/lists/:listId" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="contacts">
                  <ListContacts />
                </PermissionRoute>
              </ProtectedRoute>
            } />

            <Route path="/lists/:listId/import" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="contacts">
                  <ImportContacts />
                </PermissionRoute>
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="admin">
                  <AdminUsers />
                </PermissionRoute>
              </ProtectedRoute>
            } />


            <Route path="/campaigns/new" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="admin">
                  <CreateCampaign />
                </PermissionRoute>
              </ProtectedRoute>
            } />


            <Route path="/campaigns" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="admin">
                  <CampaignsOverview />
                </PermissionRoute>
              </ProtectedRoute>
            } />

            <Route path="/campaigns/:campaignId" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="admin">
                  <CampaignDetail />
                </PermissionRoute>
              </ProtectedRoute>
            } />


            <Route path="/campaigns/:campaignId/recipients" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="admin">
                  <CampaignRecipients />
                </PermissionRoute>
              </ProtectedRoute>
            } />


            <Route path="/templates" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="admin">
                  <TemplatesOverview />
                </PermissionRoute>
              </ProtectedRoute>
            } />

            {/* ===== FALLBACK ROUTE ===== */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;