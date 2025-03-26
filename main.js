// main.js

import { getEvent, getEventTeams, getEventSkills, getDivisionRankings, getEvents } from './api.js';

let teams = [];
let skillsRuns = [];
let qualifierRankings = [];

let selectedEventId = null;
const DIVISION_ID = '1';

function computeCutoff(totalCount) {
  return Math.max(1, Math.ceil(totalCount * 0.5));
}

/* --------------------------
   EVENT DROPDOWN & SKU LOOKUP
--------------------------- */

async function fetchEvents() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const events = await getEvents({ start: oneWeekAgo });
  return events;
}

async function populateEventDropdown() {
  const eventDropdown = document.getElementById('eventDropdown');
  const events = await fetchEvents();
  eventDropdown.innerHTML = "";
  if (events.length === 0) {
    eventDropdown.innerHTML = `<option value="">No events found</option>`;
    return;
  }
  const defaultOption = document.createElement('option');
  defaultOption.value = "";
  defaultOption.textContent = "Select an event...";
  eventDropdown.appendChild(defaultOption);
  events.forEach(event => {
    const option = document.createElement('option');
    option.value = event.id;
    option.textContent = `${event.name} (SKU: ${event.sku})`;
    eventDropdown.appendChild(option);
  });
}

async function lookupEventBySKU(sku) {
  const events = await getEvents({ sku: [sku] });
  if (events.length > 0) {
    return events[0];
  } else {
    alert("No event found with the given SKU.");
    return null;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  populateEventDropdown();
});

document.getElementById('eventDropdown').addEventListener('change', (e) => {
  selectedEventId = e.target.value;
  console.log("Selected event ID:", selectedEventId);
});

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

function calculateEligibility() {
  const sortedQualifier = [...qualifierRankings].sort((a, b) => a.rank - b.rank);
  const sortedSkills = [...skillsRuns].sort((a, b) => a.rank - b.rank);
  const qualifierCutoff = computeCutoff(sortedQualifier.length);
  const skillsCutoff = computeCutoff(sortedSkills.length);
  const qualifierMap = new Map(sortedQualifier.map(item => [item.team.id, item.rank]));
  const skillsMap = new Map(sortedSkills.map(item => [item.team.id, item.rank]));
  const eligibleTeams = [];
  const ineligibleTeams = [];
  teams.forEach(team => {
    let reasons = [];
    const qualifierRank = qualifierMap.get(team.id) || -1;
    const skillsRank = skillsMap.get(team.id) || -1;
    const skillsData = skillsRuns.find(item => item.team.id === team.id) || { score: 0, attempts: 0, type: '' };
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
    if (skillsData.type === 'programming') {
      if (skillsData.score <= 0 || skillsData.attempts === 0) {
        reasons.push(skillsData.attempts === 0
          ? "No programming attempts."
          : `Programming score: ${skillsData.score} (attempts: ${skillsData.attempts})`);
      }
    }
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

function displayResults(eligibleTeams, ineligibleTeams) {
  const eligibleContainer = document.getElementById('eligibleTeams');
  const ineligibleContainer = document.getElementById('ineligibleTeams');
  eligibleContainer.innerHTML = "";
  ineligibleContainer.innerHTML = "";
  eligibleTeams.forEach(item => {
    const div = document.createElement('div');
    div.className = "p-4 bg-green-100 border border-green-300 rounded";
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
    div.className = "p-4 bg-red-100 border border-red-300 rounded";
    let reasonsHtml = "<ul class='ml-4 text-red-700'>";
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

async function init() {
  if (!selectedEventId) {
    alert("Please select an event or lookup an event by SKU.");
    return;
  }
  await loadEventData(selectedEventId);
  calculateEligibility();
}

document.getElementById('calculateBtn').addEventListener('click', init);
