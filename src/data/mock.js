// Dummy data — field names matched with ERD (user_id, availability_type, image_url ...)
const owners = [
  { id: 2, name: 'Rahim Uddin', city: 'Sylhet', reputation_score: 4.8 },
  { id: 3, name: 'Nusrat Jahan', city: 'Dhaka', reputation_score: 4.5 },
  { id: 4, name: 'Tanvir Ahmed', city: 'Sylhet', reputation_score: 4.9 },
]

const coverImages = [
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&auto=format&fit=crop&q=60', // The Alchemist
  'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=500&auto=format&fit=crop&q=60', // Atomic Habits
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500&auto=format&fit=crop&q=60', // Pather Panchali
  'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=500&auto=format&fit=crop&q=60', // Rich Dad Poor Dad
  'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=500&auto=format&fit=crop&q=60', // Milk and Honey
  'https://images.unsplash.com/photo-1629992101753-56d196c8aabb?w=500&auto=format&fit=crop&q=60', // The Hobbit
  'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500&auto=format&fit=crop&q=60', // Zero to One
  'https://images.unsplash.com/photo-1495640388908-05fa85288e61?w=500&auto=format&fit=crop&q=60', // Deep Work
  'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=500&auto=format&fit=crop&q=60', // Matilda
  'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=500&auto=format&fit=crop&q=60', // Feluda Samagra
  'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=500&auto=format&fit=crop&q=60', // Sapiens (fixed)
  'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&auto=format&fit=crop&q=60', // Hygge
]

const raw = [
  ['The Alchemist', 'Paulo Coelho', 'Fiction', 'Good', 'exchange'],
  ['Atomic Habits', 'James Clear', 'Self-Development', 'Like New', 'donate'],
  ['Pather Panchali', 'Bibhutibhushan', 'Fiction', 'Fair', 'lend'],
  ['Rich Dad Poor Dad', 'Robert Kiyosaki', 'Business', 'Good', 'exchange'],
  ['Milk and Honey', 'Rupi Kaur', 'Poetry', 'Like New', 'exchange'],
  ['The Hobbit', 'J.R.R. Tolkien', 'Fiction', 'Good', 'lend'],
  ['Zero to One', 'Peter Thiel', 'Business', 'Like New', 'donate'],
  ['Deep Work', 'Cal Newport', 'Self-Development', 'Fair', 'exchange'],
  ['Matilda', 'Roald Dahl', 'Children', 'Good', 'donate'],
  ['Feluda Samagra', 'Satyajit Ray', 'Fiction', 'Good', 'lend'],
  ['Sapiens', 'Yuval Harari', 'History', 'Like New', 'exchange'],
  ['Hygge', 'Meik Wiking', 'Self-Development', 'Good', 'exchange'],
]

export const books = raw.map(([title, author, genre, condition, availability_type], i) => ({
  id: i + 1, title, author, genre, condition, availability_type,
  image_url: coverImages[i],
  user_id: owners[i % 3].id, owner: owners[i % 3],
  created_at: '2026-09-20T10:00:00Z',
}))

// Avatar যাদের আছে। যাদের নেই, Dashboard এ তাদের নামের initials দেখাবে।
const avatars = {
  'Paulo Coelho': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60',
  'James Clear': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60',
  'J.R.R. Tolkien': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60',
  'Robert Kiyosaki': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60',
  'Satyajit Ray': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60',
  'Yuval Harari': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=60',
}

// books থেকেই সব author বানানো হয়। একই author এর একাধিক বই থাকলে otherBooks এ আসবে।
export const authors = [...new Set(books.map((b) => b.author))].map((name) => {
  const own = books.filter((b) => b.author === name)
  return {
    name,
    avatar: avatars[name] || '',
    bestselling: own.slice(0, 1),
    otherBooks: own.slice(1),
  }
})

export const categories = ['Fiction', 'Self-Development', 'Business', 'Poetry', 'Children', 'History']

export const testimonials = [
  { name: 'Emily Thomas', role: 'Book lover', text: 'I swapped three books I had finished for ones I actually wanted, and met a neighbour who loves the same authors.' },
  { name: 'Daniel Wright', role: 'Avid reader', text: 'Ratings make it easy to trust someone new. My last exchange took one message and a coffee.' },
]

export const notifications = [
  { id: 1, type: 'wishlist_available', message: '"Sapiens" from your wishlist is now available in Sylhet', is_read: false, created_at: '2026-09-28T08:00:00Z' },
  { id: 2, type: 'request_accepted', message: 'Rahim Uddin accepted your request for "The Hobbit"', is_read: false, created_at: '2026-09-27T16:30:00Z' },
  { id: 3, type: 'new_rating', message: 'You received a new rating', is_read: true, created_at: '2026-09-25T11:00:00Z' },
]

export const me = { id: 1, name: 'Kenson', city: 'Sylhet', reputation_score: 4.7 }