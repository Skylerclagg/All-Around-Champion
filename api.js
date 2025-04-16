// api.js - Updated API integration for the Robotevents API

const BASE_URL = "https://www.robotevents.com/api/v2";
const API_TOKEN = "YOUR_API_TOKEN_HERE";

async function apiGet(url) {
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json"
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error fetching ${url}: ${response.status} ${errorText}`);
  }
  return await response.json();
}

export async function fetchEvents() {
  const url = `${BASE_URL}/events`;
  console.log("Fetching events from:", url);
  const response = await apiGet(url);
  console.log("Events response:", response);
  // Return the actual events array from response.data.data
  return response.data.data;
}

export async function fetchEventData(eventId, divisionId) {
  const teamsUrl = `${BASE_URL}/events/${eventId}/teams`;
  const teamsResponse = await apiGet(teamsUrl);
  const teams = teamsResponse.data.data;

  const rankingsUrl = `${BASE_URL}/events/${eventId}/divisions/${divisionId}/rankings`;
  const rankingsResponse = await apiGet(rankingsUrl);
  const qualifierRankings = rankingsResponse.data.data;

  const skillsUrl = `${BASE_URL}/events/${eventId}/skills`;
  const skillsResponse = await apiGet(skillsUrl);
  const skillsRankings = skillsResponse.data.data;

  return { teams, qualifierRankings, skillsRankings };
}

export async function fetchAwards(eventId) {
  const url = `${BASE_URL}/events/${eventId}/awards`;
  const response = await apiGet(url);
  // Return awards array from response.data.data
  return response.data.data;
}
