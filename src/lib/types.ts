export type UserRole = 'tenant' | 'owner' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  display_name?: string;
  phone?: string;
  whatsapp?: string;
  city?: string;
  bio?: string;
  role: UserRole;
  cid_verified: boolean;
  docs_verified: boolean;
  created_at: string;
  avatar_letter?: string;
}

export interface Listing {
  id: string;
  owner_id: string;
  title: string;
  location: string;
  city: string;
  type: string;
  price: number;
  beds: number;
  baths: number;
  sqft?: number;
  floor?: string;
  furnished?: string;
  duration: string;
  description?: string;
  rating: number;
  review_count: number;
  verified: boolean;
  has_wifi: boolean;
  has_heat: boolean;
  has_parking: boolean;
  has_water: boolean;
  has_electricity: boolean;
  has_security: boolean;
  status: 'pending' | 'live' | 'rejected' | 'unpublished';
  tag?: string;
  pal: string[];
  address?: string;
  district?: string;
  deposit?: number;
  photo_urls?: string[];
  doc_url?: string;
  created_at: string;
  owner?: Profile;
}

export interface Inquiry {
  id: string;
  listing_id: string;
  sender_id: string;
  owner_id: string;
  message: string;
  accepted: boolean;
  created_at: string;
  sender?: Profile;
  listing?: Listing;
}

export interface Message {
  id: string;
  inquiry_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface Lease {
  id: string;
  listing_id: string;
  tenant_id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  created_at: string;
  tenant?: Profile;
  listing?: Listing;
}

export interface Report {
  id: string;
  reporter_id?: string;
  title: string;
  target_listing_id?: string;
  target_user_id?: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'Investigating' | 'Resolved';
  created_at: string;
  reporter?: Profile;
}
