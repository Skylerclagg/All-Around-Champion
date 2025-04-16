import { Skill } from "robotevents/out/endpoints/skills";

const BASE_URL = "https://www.robotevents.com/api/v2";
const ROBOTEVENTS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzIiwianRpIjoiYWQyNzUwYjdmNzRmOGUyNzM5OGVkMDJlZDkyOWE4OWY1YTQzOWJkYTY5OGM4ZmY3OGY0ZTQ5ZGRiNzFkZmJjMmYzMzAyMTAzZDQ5YjFhMTQiLCJpYXQiOjE3NDI5OTUzNjcuMjI0MDU0MSwibmJmIjoxNzQyOTk1MzY3LjIyNDA1NiwiZXhwIjoyNjg5NjgwMTY3LjIxODQ5MTEsInN1YiI6IjQzOTAwIiwic2NvcGVzIjpbXX0.KmGKezP1cptZ63V5Qombw6UimQaueVhzxLtuzyNnkNcYSWCb0gPhq8va-ZJxH2YI-9sKdUlZapiLTDqdCibwNUr2UBPrh4svFT26UHH9xjvrdxkTdcnmycKCVVPE596Qp2J46x8SNhKxETUCMo-TjMNk7ciKR0QPRXHptxPZ_HYnUgomGcUMPNeJe-VcEmzeHYGdVGRdqCTZnihprg1z2yemGKnANEuqAtBFFDT2fbCZmWK1HiWI3GQrB4ZG5UsDK7xBfc6QIC0CG3N-y1LIoH02sjC_QcFt5W1bXwWdehtIt4-7YA2x5z7cb1pDd4YQ-Tr20sxZjWWfX03rzH5Ey3k93P25-TAchacyRjXX1_vQZCZWAEPQx2YLqLZPJsNeScsPb6TO4sDwluGou0BcvNhixliE18J5R-6b4A43DCtycRdepZiPun62MpKgHioInTnCeQ63VmT10981soCT9s_0lZs9juMAhBaT6V3eH0S0A-BZ-zhB9i3hUT2NiGSpPd3BYpHUHdRpxyRJ_BcIG9Y36TazhGPtdXhro1vn30yynK1-zsQkio5thzKBVZaIqO1i75p_x63KxX7P3XHeMpVP9x5KimC_dOUZWTXLJDRDX767iCyS9eF-AMFlUI-tHL6KmyN1UkT9T_UmYKLEgU9JC-Rylrf-BfaD3ygSGxA"; // Replace with your actual token

/**
 * Fetches all individual Skill runs for a given event.
 * This function handles pagination by setting per_page to 250 (maximum)
 * and looping until there is no next page.
 */
export async function fetchAllSkillsForTieBreaker(eventId: number): Promise<Skill[]> {
  let allSkills: Skill[] = [];
  let page = 1;
  const perPage = 250; // maximum allowed per_page
  let hasMore = true;
  
  while (hasMore) {
    const url = `${BASE_URL}/events/${eventId}/skills?page=${page}&per_page=${perPage}`;
    console.log(`Fetching skills for event ${eventId}, page ${page}: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${ROBOTEVENTS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      console.error(`Error fetching skills on page ${page}: ${response.statusText}`);
      throw new Error(`Error fetching skills: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Response for skills page ${page}:`, data);
    
    // The response should follow the PaginatedSkill format with a "data" property.
    let pageSkills: Skill[] = [];
    if (data && Array.isArray(data.data)) {
      pageSkills = data.data;
    } else if (Array.isArray(data)) {
      pageSkills = data;
    } else {
      console.warn(`Unexpected response format on page ${page}`);
    }
    
    allSkills = allSkills.concat(pageSkills);
    
    // Check if there's a next page. We assume the response includes a meta object with a next_page_url property.
    if (data.meta && data.meta.next_page_url) {
      page++;
    } else {
      hasMore = false;
    }
  }
  
  console.log("Fetched all skills:", allSkills);
  return allSkills;
}
