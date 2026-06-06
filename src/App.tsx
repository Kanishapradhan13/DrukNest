import { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Nav from './components/Nav';
import Footer from './components/Footer';
import Home from './pages/Home';
import Listings from './pages/Listings';
import ListingDetail from './pages/ListingDetail';
import HowItWorks from './pages/HowItWorks';
import SignIn from './pages/SignIn';
import OwnerDashboard from './pages/OwnerDashboard';
import OwnerAccount from './pages/OwnerAccount';
import AddProperty from './pages/AddProperty';
import AdminConsole from './pages/AdminConsole';
import CustomerDashboard from './pages/CustomerDashboard';
import RoommateFinder from './pages/RoommateFinder';
import type { Listing } from './lib/types';

const NO_FOOTER_VIEWS = ['admin', 'signin', 'add-property', 'dashboard', 'verify-id', 'owner', 'account'];

/* Pages only owners can access */
const OWNER_ONLY = ['owner', 'add-property', 'account'];
/* Pages tenants/guests can access — owners get redirected away */
const TENANT_ONLY = ['home', 'listings', 'roommates', 'dashboard', 'verify-id'];

function AppContent() {
  const { profile } = useAuth();
  const [view, setView] = useState('home');
  const [selectedListingId, setSelectedListingId] = useState<string | undefined>();
  const [editListing, setEditListing] = useState<Listing | null>(null);
  const [adminTab, setAdminTab] = useState<string | undefined>();
  const [searchFilters, setSearchFilters] = useState<{ city: string; type: string } | undefined>();

  /* Redirect owners away from tenant-only pages */
  useEffect(() => {
    if (profile?.role === 'owner' && TENANT_ONLY.includes(view)) {
      setView('owner');
    }
  }, [profile?.role, view]);

  /* Redirect tenants/guests away from owner-only pages */
  useEffect(() => {
    if (profile && profile.role === 'tenant' && OWNER_ONLY.includes(view)) {
      setView('dashboard');
    }
  }, [profile?.role, view]);

  const nav = (v: string) => {
    setView(v);
    window.scrollTo(0, 0);
  };

  const handleSelectListing = (id: string) => {
    setSelectedListingId(id);
    nav('detail');
  };

  const handleEditListing = (listing: Listing) => {
    setEditListing(listing);
    nav('add-property');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav view={view} setView={nav} onAdminTab={tab => { setAdminTab(tab); nav('admin'); }} />

      {view === 'home' && <Home setView={nav} onListingClick={handleSelectListing} onSearch={(city, type) => setSearchFilters({ city, type })} />}
      {view === 'listings' && <Listings setView={nav} setSelectedListing={handleSelectListing} initialCity={searchFilters?.city} initialType={searchFilters?.type} />}
      {view === 'detail' && <ListingDetail setView={nav} listingId={selectedListingId} />}
      {view === 'how' && <HowItWorks setView={nav} />}
      {view === 'signin' && <SignIn setView={nav} />}
      {view === 'owner' && <OwnerDashboard setView={nav} onEditListing={handleEditListing} />}
      {view === 'account' && <OwnerAccount setView={nav} />}
      {view === 'add-property' && <AddProperty setView={(v) => { setEditListing(null); nav(v); }} listing={editListing} />}
      {view === 'admin' && <AdminConsole setView={nav} initialTab={adminTab} onTabChange={setAdminTab} />}
      {view === 'dashboard' && <CustomerDashboard setView={nav} onListingClick={handleSelectListing} />}
      {view === 'verify-id' && <CustomerDashboard setView={nav} onListingClick={handleSelectListing} initialTab='profile' />}
      {view === 'roommates' && <RoommateFinder setView={nav} />}

      {!NO_FOOTER_VIEWS.includes(view) && <Footer setView={nav} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
