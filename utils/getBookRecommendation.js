// utils/getBookRecommendations.js
const axios = require('axios');

/**
 * Fetches a random book from Open Library for a specific genre and language.
 * @param {string} genre - The genre to search for.
 * @param {string} language - The ISO 639-1 language code (e.g., 'en', 'es').
 * @returns {Promise<Object|null>} A promise that resolves to a book object or null if an error occurs or no book is found.
 */
async function getRandomBookByGenre(genre, language = 'en') {
  if (!genre) {
    console.error('Genre is required to fetch a book.');
    return null;
  }
  // Open Library uses ISO 639-1 (en) and sometimes 639-2 (eng), but 'en' generally works.
  const url = `https://openlibrary.org/subjects/${encodeURIComponent(genre.toLowerCase())}.json?limit=50&language=${language}`;
  
  try {
    const res = await axios.get(url);
    const data = res.data;

    if (!data.works || data.works.length === 0) {
      console.warn(`No books found for genre "${genre}" in language "${language}" on Open Library.`);
      return null;
    }

    const books = data.works;
    const randomBook = books[Math.floor(Math.random() * books.length)];

    return {
      title: randomBook.title,
      author: randomBook.authors?.[0]?.name || 'Unknown Author',
      cover: randomBook.cover_id
        ? `https://covers.openlibrary.org/b/id/${randomBook.cover_id}-L.jpg`
        : null,
      openLibraryUrl: `https://openlibrary.org${randomBook.key}`,
      firstPublishYear: randomBook.first_publish_year || 'N/A'
    };
  } catch (err) {
    console.error(`Error fetching from Open Library for genre "${genre}", lang "${language}":`, err.message);
    if (err.response) {
      // Log more details if the error is from the API response
      console.error('API Response Status:', err.response.status);
      console.error('API Response Data:', err.response.data);
    }
    return null;
  }
}

/**
 * Fetches a book recommendation based on user's stored preferences.
 * @param {Object} preferences - User preferences object.
 * @param {string[]} preferences.genres - An array of preferred genres.
 * @param {string} preferences.language - The preferred language code.
 * @returns {Promise<Object|null>} A promise that resolves to a book object or null/error object.
 */
async function getRecommendationForUserPreferences(preferences) {
  if (!preferences || typeof preferences !== 'object') {
    console.error('User preferences object is required.');
    return { error: "Invalid preferences", message: "User preferences object is required." };
  }

  const { genres, language } = preferences;

  if (!language || typeof language !== 'string') {
    console.error('User preferences must include a valid language string.');
    return { error: "Invalid language", message: "User preferences must include a valid language string." };
  }

  if (!genres || !Array.isArray(genres) || genres.length === 0) {
    console.warn('No genres specified in user preferences. Cannot fetch recommendation.');
    return {
        error: "No genres specified",
        message: "Please specify at least one genre in your preferences to get book recommendations."
    };
  }

  // Randomly select one genre from the user's list
  const selectedGenre = genres[Math.floor(Math.random() * genres.length)];

  console.log(`Attempting to fetch recommendation for genre: "${selectedGenre}", language: "${language}"`);
  return getRandomBookByGenre(selectedGenre, language);
}

module.exports = {
  getRandomBookByGenre,
  getRecommendationForUserPreferences,
};