// main.js

// For demonstration, we use simulated data.
// In a real implementation, you’d replace these with API calls.
const THRESHOLD_ADC = 0.5;        // 50% cutoff for ADC
const THRESHOLD_EXCELLENCE = 0.4;   // 40% cutoff for Excellence

// Simulated team data (each team has id, number, team_name, grade, etc.)
const teams = [
  { id: 1, number: "101", team_name: "Sky High Flyers", grade: "High School" },
  { id: 2, number: "202", team_name: "Aero Wizards", grade: "High School" },
  { id: 3, number: "303", team_name: "Drone Dynamos", grade: "Middle School" },
  // ... add more teams as needed
];

// Simulated qualifier rankings for the event (combined for ADC & Excellence)
const qualifierRankings = [
  { team: { id: 1 }, rank: 1 },
  { team: { id: 2 }, rank: 2 },
  { team: { id: 3 }, rank: 3 },
  // ... add more rankings
];

// Simulated skills rankings (assumed same data for both flows)
// Each object contains team, rank, programming_score, programming_attempts, driver_score, driver_attempts.
const skillsRankings = [
  { team: { id: 1 }, rank: 2, programming_score: 85, programming_attempts: 3, driver_score: 70, driver_attempts: 2 },
  { team: { id: 2 }, rank: 1, programming_score: 90, programming_attempts: 4, driver_score: 0, driver_attempts: 3 }, // ineligible: no driver score
  { team: { id: 3 }, rank: 3, programming_score: 0, programming_attempts: 0, driver_score: 65, driver_attempts: 2 },   // ineligible: no programming score
  // ... add more skills data
];

// Simulated autonomous skills rankings for ADC (for demonstration)
const autoSkillsRankings = [
  { team: { id: 1 }, rank: 1 },
  { team: { id: 2 }, rank: 3 },
  { team: { id: 3 }, rank: 2 },
  // ... add more if needed
];

// Compute precomputed values for a team based on the rankings.
function computePrecomputedValues(team, flow) {
  // Qualifier values
  let qualifierObj = qualifierRankings.find(r => r.team.id === team.id);
  let qualifierRank = qualifierObj ? qualifierObj.rank : -1;
  let qualifierCutoff = Math.max(1, Math.round(qualifierRankings.length * (flow === "ADC" ? THRESHOLD_ADC : THRESHOLD_EXCELLENCE)));
  
  // Overall skills ranking values
  let skillsObj = skillsRankings.find(r => r.team.id === team.id);
  let skillsRank = skillsObj ? skillsObj.rank : -1;
  let skillsCutoff = qualifierCutoff; // For our purposes, use the same cutoff
  
  // For ADC, also compute autonomous skills ranking.
  let autoSkillsObj = autoSkillsRankings.find(r => r.team.id === team.id);
  let autoSkillsRank = autoSkillsObj ? autoSkillsObj.rank : -1;
  let autoSkillsCutoff = Math.max(1, Math.round(qualifierRankings.length * THRESHOLD_ADC));
  
  // Skills data
  let skillsData = skillsObj ? {
      programming_score: skillsObj.programming_score,
      programming_attempts: skillsObj.programming_attempts,
      driver_score: skillsObj.driver_score,
      driver_attempts: skillsObj.driver_attempts
  } : { programming_score: 0, programming_attempts: 0, driver_score: 0, driver_attempts: 0 };
  
  return { qualifierRank, qualifierCutoff, skillsRank, skillsCutoff, autoSkillsRank, autoSkillsCutoff, skillsData };
}

// ADC Eligibility Calculation
function calculateADCEligibility() {
    // Use the number of teams in the qualifier rankings as the basis for the cutoff.
    const totalQualifiers = qualifierRankings.length;
    const qualifierCutoff = Math.max(1, Math.ceil(totalQualifiers * 0.5));
    const skillsCutoff = qualifierCutoff; // Use the same cutoff for skills rankings
  
    const eligible = [];
    const ineligible = [];
  
    // Iterate over the teams that appear in the qualifier rankings.
    qualifierRankings.forEach(qRankObj => {
      const team = qRankObj.team;
      const reasons = [];
  
      const qualifierRank = qRankObj.rank;
      // Look up the corresponding skills ranking for the team.
      const skillsObj = skillsRankings.find(s => s.team.id === team.id);
      const skillsRank = skillsObj ? skillsObj.rank : -1;
  
      // Check qualifier ranking: team must be within the cutoff.
      if (qualifierRank > qualifierCutoff) {
        reasons.push(`Qualifier Ranking: ${qualifierRank} (cutoff: ${qualifierCutoff})`);
      }
      // Check skills ranking: team must be ranked and within the cutoff.
      if (skillsRank === -1 || skillsRank > skillsCutoff) {
        reasons.push(
          skillsRank === -1
            ? "Not ranked in skills matches."
            : `Skills Ranking: ${skillsRank} (cutoff: ${skillsCutoff})`
        );
      }
      // Check mission scores: require a score greater than 0 in both missions.
      if (!skillsObj || skillsObj.programming_score <= 0) {
        reasons.push("No autonomous flight (programming) score.");
      }
      if (!skillsObj || skillsObj.driver_score <= 0) {
        reasons.push("No piloting (driver) score.");
      }
  
      if (reasons.length === 0) {
        eligible.push({
          team,
          qualifierRank,
          qualifierCutoff,
          skillsRank,
          skillsCutoff,
          skillsData: skillsObj
        });
      } else {
        ineligible.push({
          team,
          qualifierRank,
          qualifierCutoff,
          skillsRank,
          skillsCutoff,
          skillsData: skillsObj,
          reasons
        });
      }
    });
  
    return { eligible, ineligible };
  }
  

// Excellence Eligibility Calculation (split by grade)
function calculateExcellenceEligibility(gradeCategory) {
  // Filter teams by the selected grade.
  const teamsForGrade = teams.filter(team => team.grade.toLowerCase() === gradeCategory.toLowerCase());
  const eligible = [];
  const ineligible = [];
  
  teamsForGrade.forEach(team => {
    const pre = computePrecomputedValues(team, "Excellence");
    const reasons = [];
    // Check qualifier ranking against the cutoff
    if (pre.qualifierRank === -1 || pre.qualifierRank > pre.qualifierCutoff) {
      reasons.push(pre.qualifierRank === -1 ? "Not ranked in qualifier matches." : `Qualifier Ranking: ${pre.qualifierRank} (cutoff: ${pre.qualifierCutoff})`);
    }
    // Check skills ranking
    if (pre.skillsRank === -1 || pre.skillsRank > pre.skillsCutoff) {
      reasons.push(pre.skillsRank === -1 ? "Not ranked in skills matches." : `Skills Ranking: ${pre.skillsRank} (cutoff: ${pre.skillsCutoff})`);
    }
    // Check scores for excellence eligibility
    if (pre.skillsData.programming_score <= 0 || pre.skillsData.programming_attempts === 0) {
      reasons.push("Insufficient programming score/attempts.");
    }
    if (pre.skillsData.driver_score <= 0) {
      reasons.push("No driver score.");
    }
    
    if (reasons.length === 0) {
      eligible.push({ team, pre });
    } else {
      ineligible.push({ team, pre, reasons });
    }
  });
  return { eligible, ineligible };
}

// Display the results in the page.
function displayResults(result, flow) {
  const eligibleContainer = document.getElementById('eligibleTeams');
  const ineligibleContainer = document.getElementById('ineligibleTeams');
  eligibleContainer.innerHTML = "";
  ineligibleContainer.innerHTML = "";
  
  result.eligible.forEach(item => {
    const div = document.createElement('div');
    div.className = "p-4 bg-green-100 border border-green-300 rounded shadow";
    div.innerHTML = `<strong>${item.team.number} - ${item.team.team_name}</strong><br>
      Qualifier: ${item.pre.qualifierRank}/${item.pre.qualifierCutoff}<br>
      Skills: ${item.pre.skillsRank}/${item.pre.skillsCutoff}<br>
      ${flow === 'ADC' ? `Autonomous: ${item.pre.autoSkillsRank}/${item.pre.autoSkillsCutoff}<br>` : ""}
      Programming: ${item.pre.skillsData.programming_score} (Attempts: ${item.pre.skillsData.programming_attempts})<br>
      Driver: ${item.pre.skillsData.driver_score} (Attempts: ${item.pre.skillsData.driver_attempts})`;
    eligibleContainer.appendChild(div);
  });
  
  result.ineligible.forEach(item => {
    const div = document.createElement('div');
    div.className = "p-4 bg-red-100 border border-red-300 rounded shadow";
    let reasonsHtml = "<ul class='ml-4 text-red-700'>";
    item.reasons.forEach(reason => { reasonsHtml += `<li>${reason}</li>`; });
    reasonsHtml += "</ul>";
    div.innerHTML = `<strong>${item.team.number} - ${item.team.team_name}</strong><br>
      Qualifier: ${item.pre.qualifierRank === -1 ? "Not ranked" : item.pre.qualifierRank} (cutoff: ${item.pre.qualifierCutoff})<br>
      Skills: ${item.pre.skillsRank === -1 ? "Not ranked" : item.pre.skillsRank} (cutoff: ${item.pre.skillsCutoff})<br>
      ${flow === 'ADC' ? `Autonomous: ${item.pre.autoSkillsRank === -1 ? "Not ranked" : item.pre.autoSkillsRank} (cutoff: ${item.pre.autoSkillsCutoff})<br>` : ""}
      ${reasonsHtml}`;
    ineligibleContainer.appendChild(div);
  });
}

// Event listener for the Calculate Eligibility button.
document.getElementById('calculateBtn').addEventListener('click', () => {
  // Determine which flow is selected.
  const flow = document.querySelector('input[name="flow"]:checked').value; // "ADC" or "Excellence"
  let result;
  if (flow === "ADC") {
    result = calculateADCEligibility();
    displayResults(result, "ADC");
  } else if (flow === "Excellence") {
    const gradeCategory = document.getElementById('gradeSelect').value; // e.g., "Middle School" or "High School"
    result = calculateExcellenceEligibility(gradeCategory);
    displayResults(result, "Excellence");
  }
});
