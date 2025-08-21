/**
 * A wrapper around the native fetch API that adds a timeout functionality.
 *
 * @param {string} url - The URL to fetch.
 * @param {RequestInit} options - The options for the fetch request.
 * @param {number} timeout - The timeout in milliseconds.
 * @returns {Promise<Response>} A promise that resolves with the response or rejects with a timeout error.
 */
export const fetchWithTimeout = (url, options, timeout = 15000) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), timeout)
    ),
  ]);
};
