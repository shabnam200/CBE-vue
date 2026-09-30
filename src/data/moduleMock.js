// Requests / Messages / Profile module er mock data. Real API ashle ei file lagbe na.
import { books } from './mock'

const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString()
const person = (id, name, city, reputation_score) => ({ id, name, city, reputation_score })
export const people = {
  nusrat: person(3, 'Nusrat Jahan', 'Dhaka', 4.5),
  tanvir: person(4, 'Tanvir Ahmed', 'Sylhet', 4.9),
  sumaiya: person(5, 'Sumaiya Rahman', 'Sylhet', 4.6),
  arif: person(6, 'Arif Hossain', 'Chattogram', 4.3),
}
const book = (title) => books.find((b) => b.title === title)

// incoming = onno keu amar boi chaise, outgoing = ami onno kaur boi chaisi
export const requests = [
  { id: 101, direction: 'incoming', status: 'pending', book: book('The Alchemist'), other_user: people.nusrat, message: 'Hi! I have been looking for this book for weeks. Can we meet near Zindabazar?', created_at: ago(3) },
  { id: 102, direction: 'incoming', status: 'pending', book: book('Zero to One'), other_user: people.sumaiya, message: 'Would love to have this one. I can pick it up any evening.', created_at: ago(20) },
  { id: 103, direction: 'incoming', status: 'accepted', book: book('Rich Dad Poor Dad'), other_user: people.tanvir, message: 'Can I exchange it with my copy of Deep Work?', created_at: ago(30) },
  { id: 104, direction: 'incoming', status: 'completed', book: book('Feluda Samagra'), other_user: people.arif, message: 'Thanks for lending!', created_at: ago(24 * 9), reviewed: false },
  { id: 105, direction: 'incoming', status: 'rejected', book: book('Rich Dad Poor Dad'), other_user: people.arif, message: '', created_at: ago(24 * 12) },

  { id: 201, direction: 'outgoing', status: 'pending', book: book('Sapiens'), other_user: book('Sapiens').owner, message: 'I can swap it with my Atomic Habits.', created_at: ago(6) },
  { id: 202, direction: 'outgoing', status: 'accepted', book: book('The Hobbit'), other_user: book('The Hobbit').owner, message: 'I will return it within two weeks.', created_at: ago(30) },
  { id: 203, direction: 'outgoing', status: 'completed', book: book('Milk and Honey'), other_user: book('Milk and Honey').owner, message: '', created_at: ago(24 * 8), reviewed: false },
  { id: 204, direction: 'outgoing', status: 'rejected', book: book('Deep Work'), other_user: book('Deep Work').owner, message: '', created_at: ago(52) },
  { id: 205, direction: 'outgoing', status: 'completed', book: book('Matilda'), other_user: book('Matilda').owner, message: '', created_at: ago(24 * 15), reviewed: true },
]

export const conversations = [
  { id: 1, user: people.tanvir, book: 'Rich Dad Poor Dad', unread: 2, messages: [
    { id: 1, from: 'them', text: 'Assalamu alaikum! Thanks for accepting my request.', at: ago(28) },
    { id: 2, from: 'me', text: 'Walaikum assalam! Sure. Are you free this weekend?', at: ago(27.5) },
    { id: 3, from: 'them', text: 'Friday evening works. Can we meet at the university gate?', at: ago(2) },
    { id: 4, from: 'them', text: 'I will bring Deep Work for the exchange.', at: ago(1.9) },
  ] },
  { id: 2, user: people.nusrat, book: 'The Alchemist', unread: 0, messages: [
    { id: 1, from: 'them', text: 'Hi! Is The Alchemist still available?', at: ago(4) },
    { id: 2, from: 'me', text: 'Yes it is. I will check your request now.', at: ago(3.5) },
  ] },
  { id: 3, user: people.arif, book: 'Feluda Samagra', unread: 0, messages: [
    { id: 1, from: 'me', text: 'Please take care of the book. It is my favourite.', at: ago(24 * 9.5) },
    { id: 2, from: 'them', text: 'Of course! Will return it in perfect condition.', at: ago(24 * 9.4) },
    { id: 3, from: 'them', text: 'Returned! Thank you so much.', at: ago(24 * 6) },
  ] },
]

export const reviews = [
  { id: 1, from: people.arif, rating: 5, comment: 'Very friendly, and the book was in great condition.', book: 'Feluda Samagra', created_at: ago(24 * 6) },
  { id: 2, from: people.sumaiya, rating: 5, comment: 'Quick replies and an easy handover.', book: 'Atomic Habits', created_at: ago(24 * 21) },
  { id: 3, from: people.tanvir, rating: 4, comment: 'Good exchange, arrived a little late but well communicated.', book: 'The Hobbit', created_at: ago(24 * 40) },
]

export const profileStats = { books_listed: 4, exchanges_completed: 6, wishlist_items: 6, joined_at: '2026-06-14T00:00:00Z' }
