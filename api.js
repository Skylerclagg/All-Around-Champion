// api.js - Sample API integration for the Robotevents API

const BASE_URL = "https://www.robotevents.com/api/v2";
const API_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzIiwianRpIjoiYWQyNzUwYjdmNzRmOGUyNzM5OGVkMDJlZDkyOWE4OWY1YTQzOWJkYTY5OGM4ZmY3OGY0ZTQ5ZGRiNzFkZmJjMmYzMzAyMTAzZDQ5YjFhMTQiLCJpYXQiOjE3NDI5OTUzNjcuMjI0MDU0MSwibmJmIjoxNzQyOTk1MzY3LjIyNDA1NiwiZXhwIjoyNjg5NjgwMTY3LjIxODQ5MTEsInN1YiI6IjQzOTAwIiwic2NvcGVzIjpbXX0.KmGKezP1cptZ63V5Qombw6UimQaueVhzxLtuzyNnkNcYSWCb0gPhq8va-ZJxH2YI-9sKdUlZapiLTDqdCibwNUr2UBPrh4svFT26UHH9xjvrdxkTdcnmycKCVVPE596Qp2J46x8SNhKxETUCMo-TjMNk7ciKR0QPRXHptxPZ_HYnUgomGcUMPNeJe-VcEmzeHYGdVGRdqCTZnihprg1z2yemGKnANEuqAtBFFDT2fbCZmWK1HiWI3GQrB4ZG5UsDK7xBfc6QIC0CG3N-y1LIoH02sjC_QcFt5W1bXwWdehtIt4-7YA2x5z7cb1pDd4YQ-Tr20sxZjWWfX03rzH5Ey3k93P25-TAchacyRjXX1_vQZCZWAEPQx2YLqLZPJsNeScsPb6TO4sDwluGou0BcvNhixliE18J5R-6b4A43DCtycRdepZiPun62MpKgHioInTnCeQ63VmT10981soCT9s_0lZs9juMAhBaT6V3eH0S0A-BZ-zhB9i3hUT2NiGSpPd3BYpHUHdRpxyRJ_BcIG9Y36TazhGPtdXhro1vn30yynK1-zsQkio5thzKBVZaIqO1i75p_x63KxX7P3XHeMpVP9x5KimC_dOUZWTXLJDRDX767iCyS9eF-AMFlUI-tHL6KmyN1UkT9T_UmYKLEgU9JC-Rylrf-BfaD3ygSGxA";

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

/**
 * Fetch events. For testing, we remove filtering by date.
 * The API returns an object with "meta" and "data", so we return data.data.
 */
export async function fetchEvents() {
  const url = `${BASE_URL}/events`;
  console.log("Fetching events from:", url);
  const response = await apiGet(url);
  console.log("Events response:", response);
  // Return the array of event objects
  return response.data.data;
}

/**
 * Fetches data for a specific event and division.
 * Returns an object with:
 *   - teams: array from /events/{id}/teams,
 *   - qualifierRankings: array from /events/{id}/divisions/{div}/rankings,
 *   - skillsRankings: array from /events/{id}/skills.
 */
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

/**
 * Fetches awards for a specific event.
 */
export async function fetchAwards(eventId) {
  const url = `${BASE_URL}/events/${eventId}/awards`;
  const response = await apiGet(url);
  return response.data.data;
}