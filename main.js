// main.js - Eligibility Calculation using Live Event Data

import { fetchEvents, fetchEventData, fetchAwards } from './api.js';

// ---------- Utility Functions ----------
function computeCutoff(totalCount, threshold) {
  return Math.max(1, Math.round(totalCount * threshold));
}

function getTeamRank(teamId, sortedRankings) {
  const index = sortedRankings.findIndex(r => r.team.id === teamId);
  return index >= 0 ? index + 1 : -1;
}

function getSkillsData(teamId, skillsArray) {
  const ranking = skillsArray.find(r => r.team.id === teamId);
  if (ranking) {
    return {
      programming: ranking.programming_score,
      programming_attempts: ranking.programming_attempts,
      driver: ranking.driver_score,
      driver_attempts: ranking.driver_attempts
    };
  }
  return { programming: 0, programming_attempts: 0, driver: 0, driver_attempts: 0 };
}

function PrecomputedValues(qualifierRank, qualifierCutoff, skillsRank, skillsCutoff, skillsData) {
  this.qualifierRank = qualifierRank;
  this.qualifierCutoff = qualifierCutoff;
  this.skillsRank = skillsRank;
  this.skillsCutoff = skillsCutoff;
  this.skillsData = skillsData;
}

// ---------- Eligibility Calculation Functions ----------

function calculateCombinedEligibility(team, qualifierRankings, skillsRankings, autoSkillsRankings, threshold = 0.4) {
  const sortedQualifier = qualifierRankings.slice().sort((a, b) => a.rank - b.rank);
  const sortedSkills = skillsRankings.slice().sort((a, b) => a.rank - b.rank);
  const sortedAutoSkills = autoSkillsRankings.slice().sort((a, b) => a.rank - b.rank);

  const qualifierCutoff = computeCutoff(sortedQualifier.length, threshold);
  const skillsCutoff = computeCutoff(sortedSkills.length, threshold);
  const autoSkillsCutoff = computeCutoff(sortedAutoSkills.length, threshold);

  const isInQualifierCutoff = sortedQualifier.slice(0, qualifierCutoff).some(r => r.team.id === team.id);
  const qualifierRank = getTeamRank(team.id, sortedQualifier);
  const skillsRank = getTeamRank(team.id, sortedSkills);
  const autoSkillsRank = getTeamRank(team.id, sortedAutoSkills);

  const skillsData = getSkillsData(team.id, skillsRankings);

  let eligible = true;
  let reasons = [];

  if (!isInQualifierCutoff) {
    eligible = false;
    reasons.push(`Qualifier Rank: ${qualifierRank > 0 ? qualifierRank : "Not ranked"} (cutoff: ${qualifierCutoff})`);
  }
  if (skillsData.programming <= 0) {
    eligible = false;
    reasons.push("No programming score or attempts");
  }
  if (skillsData.driver <= 0) {
    eligible = false;
    reasons.push("No driver score");
  }
  if (skillsRank < 0 || skillsRank > skillsCutoff) {
    eligible = false;
    reasons.push(`Skills Rank: ${skillsRank > 0 ? skillsRank : "Not ranked"} (cutoff: ${skillsCutoff})`);
  }
  if (autoSkillsRank < 0 || autoSkillsRank > autoSkillsCutoff) {
    eligible = false;
    reasons.push(`Autonomous Skills Rank: ${autoSkillsRank > 0 ? autoSkillsRank : "Not ranked"} (cutoff: ${autoSkillsCutoff})`);
  }

  const precomputed = new PrecomputedValues(qualifierRank, qualifierCutoff, skillsRank, skillsCutoff, skillsData);
  return { eligible, reasons, precomputed };
}

function calculateSplitEligibility(team, qualifierRankings, skillsRankings, gradeFilter, threshold = 0.5) {
  // Filter rankings to include only teams with grade equal to gradeFilter.
  const filteredQualifier = qualifierRankings.filter(r => r.team.grade === gradeFilter);
  const filteredSkills = skillsRankings.filter(r => r.team.grade === gradeFilter);

  const qualifierCutoff = computeCutoff(filteredQualifier.length, threshold);
  const skillsCutoff = qualifierCutoff; 

  const sortedQualifier = filteredQualifier.slice().sort((a, b) => a.rank - b.rank);
  const sortedSkills = filteredSkills.slice().sort((a, b) => a.rank - b.rank);

  const isInQualifierCutoff = sortedQualifier.slice(0, qualifierCutoff).some(r => r.team.id === team.id);
  const qualifierRank = getTeamRank(team.id, sortedQualifier);
  const skillsRank = getTeamRank(team.id, sortedSkills);
  const skillsData = getSkillsData(team.id, skillsRankings);

  let eligible = true;
  let reasons = [];
  if (!isInQualifierCutoff) {
    eligible = false;
    reasons.push(`Qualifier Rank: ${qualifierRank > 0 ? qualifierRank : "Not ranked"} (cutoff: ${qualifierCutoff})`);
  }
  if (skillsData.programming <= 0) {
    eligible = false;
    reasons.push("No programming score or attempts");
  }
  if (skillsData.driver <= 0) {
    eligible = false;
    reasons.push("No driver score");
  }
  if (skillsRank < 0 || skillsRank > skillsCutoff) {
    eligible = false;
    reasons.push(`Skills Rank: ${skillsRank > 0 ? skillsRank : "Not ranked"} (cutoff: ${skillsCutoff})`);
  }
  const precomputed = new PrecomputedValues(qualifierRank, qualifierCutoff, skillsRank, skillsCutoff, skillsData);
  return { eligible, reasons, precomputed };
}

// ---------- Event Handling & Data Loading ----------

// Populate event dropdown on page load.
async function loadEvents() {
  try {
    const events = await fetchEvents();
    const eventDropdown = document.getElementById('eventDropdown');
    eventDropdown.innerHTML = '';
    events.forEach(event => {
      const option = document.createElement('option');
      option.value = event.id;
      option.textContent = `${event.name} (SKU: ${event.sku})`;
      eventDropdown.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading events:", error);
  }
}

// SKU lookup: allow user to search for an event by SKU.
async function lookupEventBySKU(sku) {
  try {
    const url = `https://www.robotevents.com/api/v2/events?sku[]=${encodeURIComponent(sku)}`;
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer YOUR_API_TOKEN_HERE`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error("Error looking up event by SKU");
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error during SKU lookup:", error);
    return [];
  }
}

// Main function to perform eligibility calculation for the selected event.
async function performEligibilityCalculation(eventId) {
  try {
    // For simplicity, assume a default division ID (e.g., 1). In a full app, choose the division based on event details.
    const divisionId = 1;
    
    // Fetch event data (teams, qualifier rankings, skills rankings).
    const eventData = await fetchEventData(eventId, divisionId);
    // Fetch awards for the event.
    const awards = await fetchAwards(eventId);
    // Filter awards to those with "All-Around Champion" in the title.
    const allAroundAwards = awards.filter(a => a.title.includes("All-Around Champion"));
    // Determine eligibility mode: if more than one award exists, assume split (grade-specific); otherwise, combined.
    const isSplitMode = allAroundAwards.length > 1;
    
    // Prepare auto skills rankings from skills data.
    const autoSkillsRankings = eventData.skillsRankings
      .filter(r => r.programming_score > 0)
      .map((r, index) => ({ ...r, rank: index + 1 }));
    
    if (!isSplitMode) {
      // Combined mode: process all teams.
      let eligibleResults = [];
      let ineligibleResults = [];
      
      eventData.teams.forEach(team => {
        const result = calculateCombinedEligibility(team, eventData.qualifierRankings, eventData.skillsRankings, autoSkillsRankings, 0.4);
        if (result.eligible) {
          eligibleResults.push({ team, precomputed: result.precomputed });
        } else {
          ineligibleResults.push({ team, reasons: result.reasons, precomputed: result.precomputed });
        }
      });
      
      // Show combined results; hide split results.
      document.getElementById('combinedResults').classList.remove('hidden');
      document.getElementById('splitResults').classList.add('hidden');
      
      const eligibleContainer = document.getElementById('eligibleTeams');
      const ineligibleContainer = document.getElementById('ineligibleTeams');
      eligibleContainer.innerHTML = '';
      ineligibleContainer.innerHTML = '';
      
      eligibleResults.forEach(item => {
        const div = document.createElement('div');
        div.className = 'p-4 border rounded shadow';
        div.textContent = `${item.team.number} - ${item.team.team_name} is eligible (Qualifier Rank: ${item.precomputed.qualifierRank}/${item.precomputed.qualifierCutoff}, Skills Rank: ${item.precomputed.skillsRank}/${item.precomputed.skillsCutoff})`;
        eligibleContainer.appendChild(div);
      });
      
      ineligibleResults.forEach(item => {
        const div = document.createElement('div');
        div.className = 'p-4 border rounded shadow';
        div.innerHTML = `<strong>${item.team.number} - ${item.team.team_name} is NOT eligible</strong><br>${item.reasons.join('<br>')}`;
        ineligibleContainer.appendChild(div);
      });
      
    } else {
      // Split mode: separate listings for Middle School and High School.
      let eligibleMiddle = [], ineligibleMiddle = [];
      let eligibleHigh = [], ineligibleHigh = [];
      
      eventData.teams.forEach(team => {
        // Determine grade category: if team.grade is "Middle School", then it's Middle School; otherwise, treat as High School.
        const gradeCategory = team.grade === "Middle School" ? "Middle School" : "High School";
        const result = calculateSplitEligibility(team, eventData.qualifierRankings, eventData.skillsRankings, gradeCategory, 0.5);
        if (gradeCategory === "Middle School") {
          if (result.eligible) {
            eligibleMiddle.push({ team, precomputed: result.precomputed });
          } else {
            ineligibleMiddle.push({ team, reasons: result.reasons, precomputed: result.precomputed });
          }
        } else {
          if (result.eligible) {
            eligibleHigh.push({ team, precomputed: result.precomputed });
          } else {
            ineligibleHigh.push({ team, reasons: result.reasons, precomputed: result.precomputed });
          }
        }
      });
      
      // Show split results; hide combined results.
      document.getElementById('combinedResults').classList.add('hidden');
      document.getElementById('splitResults').classList.remove('hidden');
      
      // Middle School Results
      const eligibleMiddleContainer = document.getElementById('eligibleTeamsMiddle');
      const ineligibleMiddleContainer = document.getElementById('ineligibleTeamsMiddle');
      eligibleMiddleContainer.innerHTML = '';
      ineligibleMiddleContainer.innerHTML = '';
      
      eligibleMiddle.forEach(item => {
        const div = document.createElement('div');
        div.className = 'p-4 border rounded shadow';
        div.textContent = `${item.team.number} - ${item.team.team_name} is eligible (Qualifier Rank: ${item.precomputed.qualifierRank}/${item.precomputed.qualifierCutoff}, Skills Rank: ${item.precomputed.skillsRank}/${item.precomputed.skillsCutoff})`;
        eligibleMiddleContainer.appendChild(div);
      });
      
      ineligibleMiddle.forEach(item => {
        const div = document.createElement('div');
        div.className = 'p-4 border rounded shadow';
        div.innerHTML = `<strong>${item.team.number} - ${item.team.team_name} is NOT eligible</strong><br>${item.reasons.join('<br>')}`;
        ineligibleMiddleContainer.appendChild(div);
      });
      
      // High School Results
      const eligibleHighContainer = document.getElementById('eligibleTeamsHigh');
      const ineligibleHighContainer = document.getElementById('ineligibleTeamsHigh');
      eligibleHighContainer.innerHTML = '';
      ineligibleHighContainer.innerHTML = '';
      
      eligibleHigh.forEach(item => {
        const div = document.createElement('div');
        div.className = 'p-4 border rounded shadow';
        div.textContent = `${item.team.number} - ${item.team.team_name} is eligible (Qualifier Rank: ${item.precomputed.qualifierRank}/${item.precomputed.qualifierCutoff}, Skills Rank: ${item.precomputed.skillsRank}/${item.precomputed.skillsCutoff})`;
        eligibleHighContainer.appendChild(div);
      });
      
      ineligibleHigh.forEach(item => {
        const div = document.createElement('div');
        div.className = 'p-4 border rounded shadow';
        div.innerHTML = `<strong>${item.team.number} - ${item.team.team_name} is NOT eligible</strong><br>${item.reasons.join('<br>')}`;
        ineligibleHighContainer.appendChild(div);
      });
    }
    
  } catch (error) {
    console.error("Error performing eligibility calculation:", error);
  }
}

// ---------- Event Listeners ----------
loadEvents();

document.getElementById('lookupBtn').addEventListener('click', async () => {
  const sku = document.getElementById('skuInput').value.trim();
  if (!sku) return;
  try {
    const events = await lookupEventBySKU(sku);
    const eventDropdown = document.getElementById('eventDropdown');
    eventDropdown.innerHTML = '';
    events.forEach(event => {
      const option = document.createElement('option');
      option.value = event.id;
      option.textContent = `${event.name} (SKU: ${event.sku})`;
      eventDropdown.appendChild(option);
    });
  } catch (error) {
    console.error("Error during SKU lookup:", error);
  }
});

document.getElementById('calculateBtn').addEventListener('click', () => {
  const eventDropdown = document.getElementById('eventDropdown');
  const selectedEventId = eventDropdown.value;
  if (!selectedEventId) {
    alert("Please select an event.");
    return;
  }
  performEligibilityCalculation(selectedEventId);
});
