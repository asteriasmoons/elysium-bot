// utils/getBookRecommendation.js
const axios = require("axios");

/**
 * Fetches a list of books from Google Books API for a specific genre and language.
 * @param {string} genre - The genre/subject to search for.
 * @param {string} language - The ISO 639-1 language code (e.g., 'en').
 * @returns {Promise<Array|null>} An array of book items or null if error.
 */
async function fetchBooksByGenreAndLanguage(genre, language = "en") {
  if (!genre || typeof genre !== "string" || genre.trim() === "") {
    console.error(
      "[Util] Genre is required and must be a non-empty string to fetch books."
    );
    return null;
  }
  const langCode = (language || "en").trim().toLowerCase();
  const genreClean = genre.trim().toLowerCase();

  // Google Books API endpoint
  const url = `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(
    genreClean
  )}&langRestrict=${encodeURIComponent(langCode)}&orderBy=newest&maxResults=20`;

  console.log(`[Util/fetchBooks] Fetching books from URL: ${url}`);

  try {
    const response = await axios.get(url);
    const data = response.data;

    if (!data || !data.items || data.items.length === 0) {
      console.warn(
        `[Util/fetchBooks] No books found for genre "${genreClean}" in language "${langCode}". URL: ${url}`
      );
      return [];
    }
    console.log(
      `[Util/fetchBooks] Found ${data.items.length} books for genre "${genreClean}", lang "${langCode}".`
    );
    return data.items;
  } catch (err) {
    console.error(
      `[Util/fetchBooks] Error fetching from Google Books for genre "${genreClean}", lang "${langCode}":`,
      err.message
    );
    if (err.response) {
      console.error(
        "[Util/fetchBooks] API Response Status:",
        err.response.status
      );
    }
    return null;
  }
}

/**
 * Fetches a book recommendation based on user's stored preferences,
 * trying multiple genres and languages and avoiding previously recommended books.
 * @param {Object} prefs - User preferences object.
 * @param {string[]} prefs.genres - An array of preferred genres.
 * @param {string[]} prefs.languages - An array of preferred languages.
 * @param {string[]} [alreadySentBookIds=[]] - Array of Google Book IDs already sent.
 * @returns {Promise<Object|null>} A book object or null if no suitable book found.
 */
async function fetchPreferredBook(prefs, alreadySentBookIds = []) {
  if (!prefs || typeof prefs !== "object") {
    console.error("[Util/fetchPreferred] User preferences object is required.");
    return null;
  }

  const preferredGenres =
    prefs.genres && prefs.genres.length > 0 ? prefs.genres : ["fiction"];
  const preferredLanguages =
    prefs.languages && prefs.languages.length > 0 ? prefs.languages : ["en"];

  // Shuffle genres and languages to try different combinations each time
  const genresToTry = [...preferredGenres].sort(() => 0.5 - Math.random());
  const languagesToTry = [...preferredLanguages].sort(
    () => 0.5 - Math.random()
  );

  for (const genre of genresToTry) {
    for (const language of languagesToTry) {
      console.log(
        `[Util/fetchPreferred] Attempting: Genre "${genre}", Language "${language}"`
      );
      const books = await fetchBooksByGenreAndLanguage(genre, language);

      if (books === null) {
        // An error occurred during fetch for this combo
        console.log(
          `[Util/fetchPreferred] Fetch error for genre "${genre}", lang "${language}". Skipping to next combination.`
        );
        continue;
      }

      if (books.length > 0) {
        // Filter out already sent books
        const availableBooks = books.filter(
          (book) => book.id && !alreadySentBookIds.includes(book.id)
        );

        if (availableBooks.length > 0) {
          const randomBook =
            availableBooks[Math.floor(Math.random() * availableBooks.length)];
          const volumeInfo = randomBook.volumeInfo;

          let descriptionText =
            volumeInfo.description || "No description provided.";
          // Truncate description if it's too long
          if (descriptionText.length > 1000) {
            descriptionText = descriptionText.substring(0, 997) + "...";
          }

          return {
            title: volumeInfo.title || "Unknown Title",
            author:
              volumeInfo.authors && volumeInfo.authors.length
                ? volumeInfo.authors.join(", ")
                : "Unknown Author",
            description: descriptionText,
            genre: genre,
            language: language,
            link:
              volumeInfo.infoLink ||
              `https://books.google.com/books?id=${randomBook.id}`,
            cover:
              volumeInfo.imageLinks && volumeInfo.imageLinks.thumbnail
                ? volumeInfo.imageLinks.thumbnail.replace("http:", "https:")
                : null,
            id: randomBook.id,
            publishedDate: volumeInfo.publishedDate || "N/A",
          };
        } else {
          console.log(
            `[Util/fetchPreferred] No new books found for genre "${genre}", lang "${language}" (all candidates might have been sent or filtered).`
          );
        }
      }
    }
  }

  console.warn(
    `[Util/fetchPreferred] Exhausted all genre/language combinations. Could not find any new book for the given preferences: ${JSON.stringify(
      prefs.genres
    )} and history.`
  );
  return null;
}

module.exports = {
  fetchPreferredBook,
};
