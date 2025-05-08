const getRandomBookByGenre = require('./utils/getBookRecommendation');

(async () => {
  const book = await getRandomBookByGenre('fantasy', 'eng');
  console.log(book);
})();