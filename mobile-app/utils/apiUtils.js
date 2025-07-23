/**
 * API Utilities
 * 
 * This file provides utility functions for working with API URLs and endpoints
 */

import { API_BASE_URL } from '../config/apiConfig';

/**
 * Ensures a URL has a trailing slash
 * @param {string} url - The URL to check
 * @returns {string} - URL with trailing slash
 */
export const ensureTrailingSlash = (url) => {
  if (!url) return '';
  return url.endsWith('/') ? url : `${url}/`;
};

/**
 * Removes leading slash from a path
 * @param {string} path - The path to process
 * @returns {string} - Path without leading slash
 */
export const removeLeadingSlash = (path) => {
  if (!path) return '';
  return path.startsWith('/') ? path.substring(1) : path;
};

/**
 * Properly joins API base URL with endpoint path
 * @param {string} baseUrl - The base URL
 * @param {string} path - The endpoint path
 * @returns {string} - Properly formatted URL
 */
export const joinApiUrl = (baseUrl, path) => {
  const formattedBase = ensureTrailingSlash(baseUrl);
  const formattedPath = removeLeadingSlash(path);
  return `${formattedBase}${formattedPath}`;
};

/**
 * Creates a properly formatted API endpoint URL
 * @param {string} path - The endpoint path (with or without leading slash)
 * @returns {string} - Full API URL
 */
export const createApiUrl = (path) => {
  return joinApiUrl(API_BASE_URL, path);
};

/**
 * Tests an API endpoint and returns the response
 * @param {string} url - The full URL to test
 * @returns {Promise<Object>} - Response object with status, data, etc.
 */
export const testApiEndpoint = async (url) => {
  try {
    console.log(`Testing API endpoint: ${url}`);
    const startTime = Date.now();
    const response = await fetch(url);
    const endTime = Date.now();
    
    let data = null;
    let error = null;
    
    try {
      if (response.headers.get('content-type')?.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { text };
      }
    } catch (e) {
      error = e.message;
    }

    return {
      success: response.ok,
      status: response.status,
      data,
      error,
      headers: {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length'),
      },
      url: response.url, // Final URL after any redirects
      redirected: response.redirected,
      responseTime: endTime - startTime,
    };
  } catch (error) {
    console.error(`Error testing endpoint:`, error);
    return {
      success: false,
      error: error.message,
      url,
    };
  }
};

/**
 * Diagnoses common API URL issues
 * @param {string} baseUrl - The base URL to check
 * @returns {Object} - Diagnosis results
 */
export const diagnoseApiUrl = (baseUrl) => {
  if (!baseUrl) {
    return {
      valid: false,
      issues: ['API base URL is empty or undefined'],
      suggestions: ['Check environment variables', 'Verify API configuration'],
    };
  }

  const issues = [];
  const suggestions = [];

  // Check for protocol
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    issues.push('Missing protocol (http:// or https://)');
    suggestions.push('Add https:// to the beginning of the URL');
  }

  // Check for trailing slash
  if (!baseUrl.endsWith('/')) {
    issues.push('Missing trailing slash');
    suggestions.push('Add trailing slash to API base URL');
  }

  // Check for double slashes in the middle
  if (baseUrl.includes('//') && !baseUrl.startsWith('http')) {
    issues.push('Contains double slashes');
    suggestions.push('Remove duplicate slashes from URL');
  }

  // Check for common typos
  if (baseUrl.includes(' ')) {
    issues.push('Contains spaces');
    suggestions.push('Remove spaces from URL');
  }

  return {
    valid: issues.length === 0,
    issues,
    suggestions,
    fixedUrl: ensureTrailingSlash(baseUrl),
  };
};