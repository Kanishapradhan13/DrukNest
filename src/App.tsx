import { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
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

const NO_FOOTER_VIEWS = ['admin', 'signin', 'add-property', 'dashboard'];

function AppContent() {
  const [view, setView] = useState('home');
  const [selectedListingId, setSelectedListingId] = useState<string | undefined>();
  const [editListing, setEditListing] = useState<Listing | null>(null);

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
      <Nav view={view} setView={nav} />

      {view === 'home' && <Home setView={nav} onListingClick={handleSelectListing} />}
      {view === 'listings' && <Listings setView={nav} setSelectedListing={handleSelectListing} />}
      {view === 'detail' && <ListingDetail setView={nav} listingId={selectedListingId} />}
      {view === 'how' && <HowItWorks setView={nav} />}
      {view === 'signin' && <SignIn setView={nav} />}
      {view === 'owner' && <OwnerDashboard setView={nav} onEditListing={handleEditListing} />}
      {view === 'account' && <OwnerAccount setView={nav} />}
      {view === 'add-property' && <AddProperty setView={(v) => { setEditListing(null); nav(v); }} listing={editListing} />}
      {view === 'admin' && <AdminConsole setView={nav} />}
      {view === 'dashboard' && <CustomerDashboard setView={nav} onListingClick={handleSelectListing} />}
      {view === 'roommates' && <RoommateFinder setView={nav} />}

      {!NO_FOOTER_VIEWS.includes(view) && <Footer setView={nav} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
