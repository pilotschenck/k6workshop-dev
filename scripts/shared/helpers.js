/**
 * Shared k6 helper utilities for the workshop.
 * Import what you need:
 *   import { randomItem, randomInt, BASE_URL, testUsers, testProducts } from './shared/helpers.js';
 */

// Base URLs
export const BASE_URL = 'http://localhost:3000';
export const BROKEN_URL = 'http://localhost:3001';

/**
 * Returns a random element from an array.
 * @param {Array} arr
 * @returns {*}
 */
export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Test user accounts pre-seeded in the demo-app database.
 */
export const testUsers = [
  { username: 'alice@example.com', password: 'password123' },
  { username: 'bob@example.com', password: 'password123' },
  { username: 'carol@example.com', password: 'password123' },
  { username: 'dave@example.com', password: 'password123' },
  { username: 'eve@example.com', password: 'password123' },
];

/**
 * Product IDs available in the demo-app catalogue (IDs 1–5).
 */
export const testProducts = [
  { id: 1, name: 'Wireless Headphones', price: 79.99 },
  { id: 2, name: 'Mechanical Keyboard', price: 129.99 },
  { id: 3, name: 'Ergonomic Mouse', price: 49.99 },
  { id: 4, name: 'USB-C Hub', price: 34.99 },
  { id: 5, name: 'Laptop Stand', price: 39.99 },
];
