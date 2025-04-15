// api.js

const API_BASE = 'https://www.robotevents.com/api/v2';
const API_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzIiwianRpIjoiYWQyNzUwYjdmNzRmOGUyNzM5OGVkMDJlZDkyOWE4OWY1YTQzOWJkYTY5OGM4ZmY3OGY0ZTQ5ZGRiNzFkZmJjMmYzMzAyMTAzZDQ5YjFhMTQiLCJpYXQiOjE3NDI5OTUzNjcuMjI0MDU0MSwibmJmIjoxNzQyOTk1MzY3LjIyNDA1NiwiZXhwIjoyNjg5NjgwMTY3LjIxODQ5MTEsInN1YiI6IjQzOTAwIiwic2NvcGVzIjpbXX0.KmGKezP1cptZ63V5Qombw6UimQaueVhzxLtuzyNnkNcYSWCb0gPhq8va-ZJxH2YI-9sKdUlZapiLTDqdCibwNUr2UBPrh4svFT26UHH9xjvrdxkTdcnmycKCVVPE596Qp2J46x8SNhKxETUCMo-TjMNk7ciKR0QPRXHptxPZ_HYnUgomGcUMPNeJe-VcEmzeHYGdVGRdqCTZnihprg1z2yemGKnANEuqAtBFFDT2fbCZmWK1HiWI3GQrB4ZG5UsDK7xBfc6QIC0CG3N-y1LIoH02sjC_QcFt5W1bXwWdehtIt4-7YA2x5z7cb1pDd4YQ-Tr20sxZjWWfX03rzH5Ey3k93P25-TAchacyRjXX1_vQZCZWAEPQx2YLqLZPJsNeScsPb6TO4sDwluGou0BcvNhixliE18J5R-6b4A43DCtycRdepZiPun62MpKgHioInTnCeQ63VmT10981soCT9s_0lZs9juMAhBaT6V3eH0S0A-BZ-zhB9i3hUT2NiGSpPd3BYpHUHdRpxyRJ_BcIG9Y36TazhGPtdXhro1vn30yynK1-zsQkio5thzKBVZaIqO1i75p_x63KxX7P3XHeMpVP9x5KimC_dOUZWTXLJDRDX767iCyS9eF-AMFlUI-tHL6KmyN1UkT9T_UmYKLEgU9JC-Rylrf-BfaD3ygSGxA';
async function fetchData(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

export async function getEvent(eventId) {
  const url = `${API_BASE}/events/${eventId}`;
  return await fetchData(url);
}

export async function getEventTeams(eventId) {
  const url = `${API_BASE}/events/${eventId}/teams`;
  const data = await fetchData(url);
  return data?.data || [];
}

export async function getEventSkills(eventId) {
  const url = `${API_BASE}/events/${eventId}/skills`;
  const data = await fetchData(url);
  return data?.data || [];
}

export async function getDivisionRankings(eventId, divisionId) {
  const url = `${API_BASE}/events/${eventId}/divisions/${divisionId}/rankings`;
  const data = await fetchData(url);
  return data?.data || [];
}

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
