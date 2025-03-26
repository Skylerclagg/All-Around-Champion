// main.js

import { getEvent, getEventTeams, getEventSkills, getDivisionRankings, getEvents } from './api.js';

// Global variables to hold fetched data
let teams = [];
let skillsRuns = [];
let qualifierRankings = [];

// Global variable to hold the selected event ID.
let selectedEventId = null;

// Example division ID – adjust as needed.
const DIVISION_ID = '1';

// Helper function to compute cutoff (50% threshold)
function computeCutoff(totalCount) {
  return Math.max(1, Math.ceil(totalCount * 0.5));
}

/* --------------------------
   EVENT DROPDOWN & SKU LOOKUP
--------------------------- */

// Fetch events using the API with a start date of 1 week ago
async function fetchEvents() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  // Call getEvents with the 'start' parameter.
  const events = await getEvents({ start: oneWeekAgo });
  return events;
}

// Populate the dropdown with events
async function populateEventDropdown() {
  const eventDropdown = document.getElementById('eventDropdown');
  const events = await fetchEvents();

  // Clear the dropdown
  eventDropdown.innerHTML = "";

  if (events.length === 0) {
    eventDropdown.innerHTML = `<option value="">No events found</option>`;
    return;
  }

  // Default option
  const defaultOption = document.createElement('option');
  defaultOption.value = "";
  defaultOption.textContent = "Select an event...";
  eventDropdown.appendChild(defaultOption);

  // Populate dropdown with events (assumes each event has id, sku, and name)
  events.forEach(event => {
    const option = document.createElement('option');
    option.value = event.id;
    option.textContent = `${event.name} (SKU: ${event.sku})`;
    eventDropdown.appendChild(option);
  });
}

// Lookup an event by SKU
async function lookupEventBySKU(sku) {
  const events = await getEvents({ sku: [sku] });
  if (events.length > 0) {
    return events[0]; // Use the first matching event
  } else {
    alert("No event found with the given SKU.");
    return null;
  }
}

// When page loads, populate the dropdown.
window.addEventListener('DOMContentLoaded', () => {
  populateEventDropdown();
});

// Event listener for dropdown change.
document.getElementById('eventDropdown').addEventListener('change', (e) => {
  selectedEventId = e.target.value;
  console.log("Selected event ID:", selectedEventId);
});

// Event listener for SKU lookup button.
document.getElementById('lookupBtn').addEventListener('click', async () => {
  const sku = document.getElementById('skuInput').value.trim();
  if (!sku) {
    alert("Please enter an Event SKU.");
    return;
  }
  const event = await lookupEventBySKU(sku);
  if (event) {
    selectedEventId = event.id;
    document.getElementById('eventDropdown').value = event.id;
    console.log("Event found by SKU:", event);
  }
});

/* --------------------------
   DATA LOADING & ELIGIBILITY CALCULATION
--------------------------- */

// Load event-specific data (teams, skills runs, qualifier rankings)
async function loadEventData(eventId) {
  const event = await getEvent(eventId);
  console.log("Event details:", event);

  const [teamsData, skillsData, rankingsData] = await Promise.all([
    getEventTeams(eventId),
    getEventSkills(eventId),
    getDivisionRankings(eventId, DIVISION_ID)
  ]);

  teams = teamsData;
  skillsRuns = skillsData;
  qualifierRankings = rankingsData;

  console.log("Teams:", teams);
  console.log("Skills Runs:", skillsRuns);
  console.log("Qualifier Rankings:", qualifierRankings);
}

// Eligibility calculation function.
function calculateEligibility() {
  const sortedQualifier = [...qualifierRankings].sort((a, b) => a.rank - b.rank);
  const sortedSkills = [...skillsRuns].sort((a, b) => a.rank - b.rank);

  const qualifierCutoff = computeCutoff(sortedQualifier.length);
  const skillsCutoff = computeCutoff(sortedSkills.length);

  // Build lookup maps assuming each ranking or skill run contains a nested team object.
  const qualifierMap = new Map(sortedQualifier.map(item => [item.team.id, item.rank]));
  const skillsMap = new Map(sortedSkills.map(item => [item.team.id, item.rank]));

  const eligibleTeams = [];
  const ineligibleTeams = [];

  teams.forEach(team => {
    let reasons = [];
    const qualifierRank = qualifierMap.get(team.id) || -1;
    const skillsRank = skillsMap.get(team.id) || -1;

    // Get skills data for the team.
    const skillsData = skillsRuns.find(item => item.team.id === team.id) ||
      { score: 0, attempts: 0, type: '' };

    if (qualifierRank === -1 || qualifierRank > qualifierCutoff) {
      reasons.push(qualifierRank === -1
        ? "Not ranked in qualifier matches."
        : `Qualifier Ranking: ${qualifierRank} (cutoff: ${qualifierCutoff})`);
    }
    if (skillsRank === -1 || skillsRank > skillsCutoff) {
      reasons.push(skillsRank === -1
        ? "Not ranked in skills matches."
        : `Skills Ranking: ${skillsRank} (cutoff: ${skillsCutoff})`);
    }
    // Example check: if the skills run is for programming.
    if (skillsData.type === 'programming') {
      if (skillsData.score <= 0 || skillsData.attempts === 0) {
        reasons.push(skillsData.attempts === 0
          ? "No programming attempts."
          : `Programming score: ${skillsData.score} (attempts: ${skillsData.attempts})`);
      }
    }
    // Check driver score if the run is of type 'driver'.
    if (skillsData.type === 'driver' && skillsData.score <= 0) {
      reasons.push("No driver score.");
    }

    if (reasons.length === 0) {
      eligibleTeams.push({
        team,
        qualifierRank,
        qualifierCutoff,
        skillsRank,
        skillsCutoff,
        skillsData
      });
    } else {
      ineligibleTeams.push({
        team,
        qualifierRank,
        qualifierCutoff,
        skillsRank,
        skillsCutoff,
        skillsData,
        reasons
      });
    }
  });

  displayResults(eligibleTeams, ineligibleTeams);
}

// Display results on the page.
function displayResults(eligibleTeams, ineligibleTeams) {
  const eligibleContainer = document.getElementById('eligibleTeams');
  const ineligibleContainer = document.getElementById('ineligibleTeams');

  eligibleContainer.innerHTML = "";
  ineligibleContainer.innerHTML = "";

  eligibleTeams.forEach(item => {
    const div = document.createElement('div');
    div.classList.add("team", "eligible");
    div.innerHTML = `
      <strong>${item.team.number} - ${item.team.team_name}</strong><br>
      Qualifier Ranking: ${item.qualifierRank} (cutoff: ${item.qualifierCutoff})<br>
      Skills Ranking: ${item.skillsRank} (cutoff: ${item.skillsCutoff})<br>
      Score: ${item.skillsData.score} (Attempts: ${item.skillsData.attempts})
    `;
    eligibleContainer.appendChild(div);
  });

  ineligibleTeams.forEach(item => {
    const div = document.createElement('div');
    div.classList.add("team", "ineligible");
    let reasonsHtml = "<ul class='reasons'>";
    item.reasons.forEach(reason => {
      reasonsHtml += `<li>${reason}</li>`;
    });
    reasonsHtml += "</ul>";
    div.innerHTML = `
      <strong>${item.team.number} - ${item.team.team_name}</strong><br>
      Qualifier Ranking: ${item.qualifierRank === -1 ? "Not ranked" : item.qualifierRank} (cutoff: ${item.qualifierCutoff})<br>
      Skills Ranking: ${item.skillsRank === -1 ? "Not ranked" : item.skillsRank} (cutoff: ${item.skillsCutoff})<br>
      ${reasonsHtml}
    `;
    ineligibleContainer.appendChild(div);
  });
}

// Main initialization: load event data and calculate eligibility.
async function init() {
  if (!selectedEventId) {
    alert("Please select an event or lookup an event by SKU.");
    return;
  }
  await loadEventData(selectedEventId);
  calculateEligibility();
}

// Event listener for the Calculate Eligibility button.
document.getElementById('calculateBtn').addEventListener('click', init);
