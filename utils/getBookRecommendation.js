// utils/getBookRecommendation.js
const axios = require('axios');

/**
 * Fetches a list of book "works" from Open Library for a specific genre and language.
 * @param {string} genre - The genre to search for.
 * @param {string} language - The ISO 639-1 language code (e.g., 'eng').
 * @returns {Promise<Array|null>} A promise that resolves to an array of book works or null if a fetch error occurs.
 *                                Returns an empty array if no books are found for the criteria.
 */
async function fetchWorksByGenreAndLanguage(genre, language = 'eng') {
  if (!genre || typeof genre !== 'string' || genre.trim() === '') {
    console.error('[Util] Genre is required and must be a non-empty string to fetch books.');
    return null; // Indicate an issue with input
  }
  const langCode = (language || 'eng').trim().toLowerCase(); // Default to 'eng' if language is null or empty
  const genreClean = genre.trim().toLowerCase();

  const url = `https://openlibrary.org/subjects/${encodeURIComponent(genreClean)}.json?limit=50&language=${encodeURIComponent(langCode)}`;
  console.log(`[Util/fetchWorks] Fetching books from URL: ${url}`);

  try {
    const response = await axios.get(url); // Correct axios usage
    const data = response.data;

    if (!data || !data.works || data.works.length === 0) {
      console.warn(`[Util/fetchWorks] No books found for genre "${genreClean}" in language "${langCode}". URL: ${url}`);
      return []; // Return empty array for "found nothing"
    }
    console.log(`[Util/fetchWorks] Found ${data.works.length} works for genre "${genreClean}", lang "${langCode}".`);
    return data.works;
  } catch (err) {
    console.error(`[Util/fetchWorks] Error fetching from Open Library for genre "${genreClean}", lang "${langCode}":`, err.message);
    if (err.response) {
      console.error('[Util/fetchWorks] API Response Status:', err.response.status);
      // console.error('[Util/fetchWorks] API Response Data:', JSON.stringify(err.response.data)); // Can be very verbose
    }
    return null; // Indicate a fetch error
  }
}

/**
 * Fetches a book recommendation based on user's stored preferences,
 * trying multiple genres and languages and avoiding previously recommended books.
 * @param {Object} prefs - User preferences object.
 * @param {string[]} prefs.genres - An array of preferred genres.
 * @param {string[]} prefs.languages - An array of preferred languages.
 * @param {string[]} [alreadySentBookKeys=[]] - Array of Open Library book keys that have already been sent.
 * @returns {Promise<Object|null>} A promise that resolves to a book object or null if no suitable book is found.
 */
async function fetchPreferredBook(prefs, alreadySentBookKeys = []) {
  if (!prefs || typeof prefs !== 'object') {
    console.error('[Util/fetchPreferred] User preferences object is required.');
    return null;
  }

  const preferredGenres = (prefs.genres && prefs.genres.length > 0) ? prefs.genres : ['fantasy'];
  const preferredLanguages = (prefs.languages && prefs.languages.length > 0) ? prefs.languages : ['eng'];

  // Shuffle genres and languages to try different combinations each time
  const genresToTry = [...preferredGenres].sort(() => 0.5 - Math.random());
  const languagesToTry = [...preferredLanguages].sort(() => 0.5 - Math.random());

  for (const genre of genresToTry) {
    for (const language of languagesToTry) {
      console.log(`[Util/fetchPreferred] Attempting: Genre "${genre}", Language "${language}"`);
      const works = await fetchWorksByGenreAndLanguage(genre, language);

      if (works === null) { // An error occurred during fetch for this combo
        console.log(`[Util/fetchPreferred] Fetch error for genre "${genre}", lang "${language}". Skipping to next combination.`);
        continue; // Try next language or genre
      }

      if (works.length > 0) {
        const availableBooks = works.filter(work => work.key && !alreadySentBookKeys.includes(work.key));

        if (availableBooks.length > 0) {
          const randomBook = availableBooks[Math.floor(Math.random() * availableBooks.length)];
          console.log(`[Util/fetchPreferred] Success! Selected new book: "${randomBook.title}" (Key: ${randomBook.key}) for genre "${genre}", lang "${language}".`);

          let descriptionText = "No description provided.";
          if (randomBook.description) {
            if (typeof randomBook.description === 'string') {
              descriptionText = randomBook.description;
            } else if (randomBook.description.value) {
              descriptionText = randomBook.description.value;
            }
          }
          // Truncate description if it's too long for Discord embeds
          if (descriptionText.length > 1000) {
            descriptionText = descriptionText.substring(0, 997) + "...";
          }

          return {
            title: randomBook.title || "Unknown Title",
            author: randomBook.authors && randomBook.authors.length ? randomBook.authors[0].name : "Unknown Author",
            description: descriptionText,
            genre: genre, // The genre that yielded the result
            language: language, // The language that yielded the result
            link: `https://openlibrary.org${randomBook.key}`,
            cover: randomBook.cover_id ? `https://covers.openlibrary.org/b/id/${randomBook.cover_id}-L.jpg` : null,
            key: randomBook.key,
            firstPublishYear: randomBook.first_publish_year || 'N/A'
          };
        } else {
          console.log(`[Util/fetchPreferred] No new books found for genre "${genre}", lang "${language}" (all candidates might have been sent or filtered).`);
        }
      }
    }
  }

  console.warn(`[Util/fetchPreferred] Exhausted all genre/language combinations. Could not find any new book for the given preferences: ${JSON.stringify(prefs.genres)} and history.`);
  return null;
}

// The old `getRandomBookByGenre` and `getRecommendationForUserPreferences` are now effectively replaced by the two functions above.
module.exports = {
  fetchPreferredBook,
  // fetchWorksByGenreAndLanguage, // You might not need to export this one if only fetchPreferredBook uses it
};