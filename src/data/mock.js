// Dummy data — field names matched with ERD (user_id, availability_type, image_url ...)[cite: 9]
const owners = [
  { id: 2, name: 'Rahim Uddin', city: 'Sylhet', reputation_score: 4.8 },
  { id: 3, name: 'Nusrat Jahan', city: 'Dhaka', reputation_score: 4.5 },
  { id: 4, name: 'Tanvir Ahmed', city: 'Sylhet', reputation_score: 4.9 },
]

const coverImages = [
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1629992101753-56d196c8aabb?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1495640388908-05fa85288e61?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&auto=format&fit=crop&q=60',
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

// Wishlist mock items (derived or specific to wishlist API scope)[cite: 9]
export const initialWishlist = books.slice(0, 6).map((book, index) => ({
  ...book,
  available: index % 2 === 0, // simulating availability status
}))

export const categories = ['Fiction', 'Self-Development', 'Business', 'Poetry', 'Children', 'History']
export const me = { id: 1, name: 'Kenson', city: 'Sylhet', reputation_score: 4.7 }

export const testimonials = [
  {
    id: 1,
    name: 'Tanvir Ahmed',
    role: 'University Student',
    content: 'This platform made exchanging my old semester books super easy. Highly recommended!',
    avatar: ''
  },
  {
    id: 2,
    name: 'Sumaiya Rahman',
    role: 'Reader',
    content: 'Great community! I love the wishlist feature and how fast people respond.',
    avatar: ''
  }
];

// ---- Dashboard er jonno lagbe (age export chilo na) ----
const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString()

// Author gulo books theke derive kora
export const authors = [...new Set(books.map((b) => b.author))].map((name) => {
  const own = books.filter((b) => b.author === name)
  return { name, avatar: '', bestselling: own.slice(0, 3), otherBooks: own.slice(3) }
})

// type: wishlist | request | accepted | rejected | review | message | system
export const notifications = [
  { id: 1, type: 'wishlist', message: '"Sapiens" from your wishlist is now available in Sylhet.', is_read: false, created_at: ago(1), link: '/wishlist' },
  { id: 2, type: 'request', message: 'Nusrat Jahan sent you a request for "The Alchemist".', is_read: false, created_at: ago(3), link: '/requests' },
  { id: 3, type: 'message', message: 'Tanvir Ahmed sent you a new message.', is_read: false, created_at: ago(5), link: '/messages' },
  { id: 4, type: 'accepted', message: 'Tanvir Ahmed accepted your request for "The Hobbit".', is_read: true, created_at: ago(30), link: '/requests' },
  { id: 5, type: 'rejected', message: 'Your request for "Deep Work" was declined.', is_read: true, created_at: ago(52), link: '/requests' },
  { id: 6, type: 'review', message: 'Arif Hossain rated you 5 stars.', is_read: true, created_at: ago(24 * 6), link: '/profile' },
  { id: 7, type: 'system', message: 'Welcome to Book Haven! Add your first book to start sharing.', is_read: true, created_at: ago(24 * 20), link: '/my-books' },
]
