// api.js

const API_BASE = 'https://www.robotevents.com/api/v2';
const API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your actual API key

// Helper function for GET requests.
async function fetchData(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

// Get a single event.
export async function getEvent(eventId) {
  const url = `${API_BASE}/events/${eventId}`;
  return await fetchData(url);
}

// Get teams for an event.
export async function getEventTeams(eventId) {
  const url = `${API_BASE}/events/${eventId}/teams`;
  const data = await fetchData(url);
  return data?.data || [];
}

// Get skills runs for an event.
export async function getEventSkills(eventId) {
  const url = `${API_BASE}/events/${eventId}/skills`;
  const data = await fetchData(url);
  return data?.data || [];
}

// Get division rankings (used as qualifier rankings) for a given division.
export async function getDivisionRankings(eventId, divisionId) {
  const url = `${API_BASE}/events/${eventId}/divisions/${divisionId}/rankings`;
  const data = await fetchData(url);
  return data?.data || [];
}

// Get events with filtering options.
// Pass queryParams as an object, e.g., { start: "2025-03-19T00:00:00Z", sku: ["ABC123"] }
export async function getEvents(queryParams = {}) {
  const url = new URL(`${API_BASE}/events`);
  Object.keys(queryParams).forEach(key => {
    if (Array.isArray(queryParams[key])) {
      queryParams[key].forEach(val => url.searchParams.append(`${key}[]`, val));
    } else {
      url.searchParams.append(key, queryParams[key]);
    }
  });
  const data = await fetchData(url.toString());
  return data?.data || [];
}
