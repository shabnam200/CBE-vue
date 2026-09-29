// resources/js/data/adminMock.js
// Dummy data for the admin dashboard.
// Books come from your existing ./mock.js (so the same cover images show up);
// members are added here because mock.js only has 3 owners.
// Field names match the Laravel API (/api/admin/users, /api/admin/books, /api/admin/stats).
import { books as baseBooks } from './mock'

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString()

export const mockUsers = [
  { id: 1,  name: 'Admin',           email: 'admin@example.com',    city: 'Sylhet',     role: 'admin', reputation_score: 0,   profile_photo_url: null, created_at: daysAgo(420), reports: [] },
  { id: 2,  name: 'Rahim Uddin',     email: 'rahim@example.com',    city: 'Sylhet',     role: 'user',  reputation_score: 4.8, profile_photo_url: null, created_at: daysAgo(3),   reports: [] },
  { id: 3,  name: 'Nusrat Jahan',    email: 'nusrat@example.com',   city: 'Dhaka',      role: 'user',  reputation_score: 4.5, profile_photo_url: null, created_at: daysAgo(9),   reports: [
    { id: 1, user_id: 6, reported_user_id: 3, reason: 'Agreed to lend a book, then stopped replying after the handover time.', created_at: daysAgo(6) },
  ] },
  { id: 4,  name: 'Tanvir Ahmed',    email: 'tanvir@example.com',   city: 'Sylhet',     role: 'user',  reputation_score: 4.9, profile_photo_url: null, created_at: daysAgo(15),  reports: [] },
  { id: 5,  name: 'Shakib Anwar',    email: 'shakib@example.com',   city: 'Chattogram', role: 'user',  reputation_score: 2.1, profile_photo_url: null, created_at: daysAgo(30),  reports: [
    { id: 2, user_id: 4, reported_user_id: 5, reason: 'The book was listed as "good" but the cover was torn and pages were missing.', created_at: daysAgo(20) },
    { id: 3, user_id: 2, reported_user_id: 5, reason: 'Asked me to pay money for a book that was listed as a free donation.', created_at: daysAgo(12) },
    { id: 4, user_id: 8, reported_user_id: 5, reason: 'Rude messages in the exchange chat.', created_at: daysAgo(4) },
  ] },
  { id: 6,  name: 'Sadia Rahman',    email: 'sadia@example.com',    city: 'Sylhet',     role: 'user',  reputation_score: 4.4, profile_photo_url: null, created_at: daysAgo(44),  reports: [] },
  { id: 7,  name: 'Imran Hossain',   email: 'imran@example.com',    city: 'Rajshahi',   role: 'user',  reputation_score: 3.7, profile_photo_url: null, created_at: daysAgo(60),  reports: [] },
  { id: 8,  name: 'Mahi Chowdhury',  email: 'mahi@example.com',     city: 'Dhaka',      role: 'user',  reputation_score: 4.8, profile_photo_url: null, created_at: daysAgo(75),  reports: [] },
  { id: 9,  name: 'Farhana Akter',   email: 'farhana@example.com',  city: 'Khulna',     role: 'user',  reputation_score: 3.9, profile_photo_url: null, created_at: daysAgo(120), reports: [
    { id: 5, user_id: 7, reported_user_id: 9, reason: 'Did not show up to the meetup point twice.', created_at: daysAgo(40) },
  ] },
  { id: 10, name: 'Arif Mahmud',     email: 'arif@example.com',     city: 'Sylhet',     role: 'user',  reputation_score: 4.1, profile_photo_url: null, created_at: daysAgo(200), reports: [] },
  { id: 11, name: 'Jannat Ferdous',  email: 'jannat@example.com',   city: 'Dhaka',      role: 'user',  reputation_score: 0,   profile_photo_url: null, created_at: daysAgo(310), reports: [] },
  { id: 12, name: 'Sabbir Khan',     email: 'sabbir@example.com',   city: 'Barishal',   role: 'user',  reputation_score: 3.3, profile_photo_url: null, created_at: daysAgo(400), reports: [] },
]

const owner = (id) => {
  const u = mockUsers.find((x) => x.id === id) || mockUsers[1]
  return { id: u.id, name: u.name, email: u.email }
}

// mock.js books all have the same created_at, so spread them out.
// The last two are over a year old, to demo the "old books" filter.
const ages = [2, 5, 8, 14, 21, 33, 48, 70, 140, 300, 420, 600]

export const mockBooks = baseBooks.map((b, i) => ({
  id: b.id,
  title: b.title,
  author: b.author,
  genre: b.genre,
  condition: b.condition,
  availability_type: b.availability_type,
  image_url: b.image_url,
  created_at: daysAgo(ages[i % ages.length]),
  owner: owner(b.user_id),
}))

// there is no exchange table in the dummy set, so these are fixed
export const mockExchangeTotals = { exchange_requests: 42, completed_exchanges: 17 }