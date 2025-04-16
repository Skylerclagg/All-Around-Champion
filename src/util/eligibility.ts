// eligibility.ts
import { Ranking } from "robotevents/out/endpoints/rankings";
import { Skill } from "robotevents/out/endpoints/skills";
import { Team } from "robotevents/out/endpoints/teams";

export type TeamEligibilityCriterion = {
  eligible: boolean;
  reason: string;
  rank: number;
};

export type TeamEligibility = {
  team: Team;
  eligible: boolean;
  ranking: TeamEligibilityCriterion;
  autoSkills: TeamEligibilityCriterion & { score: number };
  skills: TeamEligibilityCriterion & { score: number };
};

export type TeamRecord = {
  driver: Skill | null;
  programming: Skill | null;
  overall: number;
};

export type GetTeamEligibilityArgs = {
  team: Team;
  rankings: Ranking[];
  autoRankings: TeamRecord[];
  skills: TeamRecord[];
  rankingThreshold: number;
  skillsThreshold: number;
  rawSkills?: Skill[]; // All individual Skill runs for tie-breakers
  targetGrade?: string; // "Overall" or specific grade (e.g., "Middle School")
  gradeLookup?: Map<number, string>; // Maps team ID -> full team grade
};

const THRESHOLD = 0.5;

/**
 * Comparator for tie-breakers that compares two teams using raw skills data.
 * Rules:
 *   1. Compare top 4 programming scores (descending)
 *   2. If tied, compare top 2 driver scores (descending)
 */
function compareTieBreakers(aTeamId: number, bTeamId: number, rawSkills: Skill[]): number {
  const getSortedScores = (
    teamId: number,
    type: "programming" | "driver",
    limit: number
  ): number[] => {
    const scores = rawSkills
      .filter((s) => s.team.id === teamId && s.type === type)
      .map((s) => s.score)
      .sort((a, b) => b - a);
    console.log(`Team ${teamId} ${type} scores:`, scores);
    return scores.slice(0, limit);
  };

  const progScoresA = getSortedScores(aTeamId, "programming", 4);
  const progScoresB = getSortedScores(bTeamId, "programming", 4);
  console.log(`Comparing programming scores for teams ${aTeamId} vs ${bTeamId}:`, { progScoresA, progScoresB });
  for (let i = 0; i < 4; i++) {
    const scoreA = progScoresA[i] ?? 0;
    const scoreB = progScoresB[i] ?? 0;
    if (scoreA !== scoreB) {
      console.log(`Programming tie-breaker at index ${i}: ${scoreB} - ${scoreA} = ${scoreB - scoreA}`);
      return scoreB - scoreA;
    }
  }

  const driverScoresA = getSortedScores(aTeamId, "driver", 2);
  const driverScoresB = getSortedScores(bTeamId, "driver", 2);
  console.log(`Comparing driver scores for teams ${aTeamId} vs ${bTeamId}:`, { driverScoresA, driverScoresB });
  for (let i = 0; i < 2; i++) {
    const dA = driverScoresA[i] ?? 0;
    const dB = driverScoresB[i] ?? 0;
    if (dA !== dB) {
      console.log(`Driver tie-breaker at index ${i}: ${dB} - ${dA} = ${dB - dA}`);
      return dB - dA;
    }
  }
  return 0;
}

/**
 * Evaluates a single team's eligibility.
 * If targetGrade is provided and not "Overall", the aggregated data is filtered by that grade
 * (using gradeLookup), and the ranks are recalculated relative to that subgroup.
 */
export function getTeamEligibility({
  team,
  rankings,
  autoRankings,
  skills,
  rankingThreshold,
  skillsThreshold,
  rawSkills,
  targetGrade = "Overall",
  gradeLookup,
}: GetTeamEligibilityArgs): TeamEligibility {
  // Initialize effective thresholds with passed-in values.
  let effectiveRankingThreshold: number = rankingThreshold;
  let effectiveSkillsThreshold: number = skillsThreshold;
  let effectiveRanking: number;
  let effectiveSkillsRank: number;
  let aggregatedRankings = rankings;
  let aggregatedSkills = skills;

  if (targetGrade !== "Overall") {
    // Filter qualification rankings by target grade using the gradeLookup.
    const filteredRankings = rankings.filter((r) => {
      const teamId = r.team.id;
      const teamGrade = gradeLookup ? gradeLookup.get(teamId) : r.team.grade;
      return teamGrade === targetGrade;
    });
    const sortedFilteredRankings = [...filteredRankings].sort((a, b) => a.rank - b.rank);
    effectiveRanking = sortedFilteredRankings.findIndex((r) => r.team.id === team.id) + 1;
    effectiveRankingThreshold = Math.max(1, Math.ceil(sortedFilteredRankings.length * THRESHOLD));
    console.log(`Team ${team.id} qualifier rank (${targetGrade}): ${effectiveRanking} (cutoff: ${effectiveRankingThreshold})`);

    // Filter aggregated skills by target grade.
    const filteredSkills = skills.filter((rec) => {
      const recTeamId = rec.driver?.team.id ?? rec.programming?.team.id;
      const recGrade = gradeLookup ? gradeLookup.get(recTeamId) : "";
      return recGrade === targetGrade;
    });
    const sortedFilteredSkills = [...filteredSkills].sort((a, b) => b.overall - a.overall);
    effectiveSkillsRank = sortedFilteredSkills.findIndex((r) => {
      const id = r.driver?.team.id ?? r.programming?.team.id;
      return id === team.id;
    }) + 1;
    effectiveSkillsThreshold = Math.max(1, Math.ceil(sortedFilteredSkills.length * THRESHOLD));
    console.log(`Team ${team.id} overall skills rank (${targetGrade}): ${effectiveSkillsRank} (cutoff: ${effectiveSkillsThreshold})`);
    
    aggregatedRankings = sortedFilteredRankings;
    aggregatedSkills = sortedFilteredSkills;
  } else {
    effectiveRanking = rankings.findIndex((r) => r.team.id === team.id) + 1;
    effectiveSkillsRank = skills.findIndex((r) => {
      const id = r.driver?.team.id ?? r.programming?.team.id;
      return id === team.id;
    }) + 1;
  }

  // Build the qualifier ranking criterion.
  let rankingCriterion: TeamEligibilityCriterion;
  if (!effectiveRanking) {
    rankingCriterion = { eligible: false, rank: effectiveRanking, reason: "No Data" };
  } else if (effectiveRanking > effectiveRankingThreshold) {
    rankingCriterion = { eligible: false, rank: effectiveRanking, reason: `Rank ${effectiveRanking}` };
  } else {
    rankingCriterion = { eligible: true, rank: effectiveRanking, reason: `Rank ${effectiveRanking}` };
  }

  // --- Autonomous Skills Criterion (unchanged) ---
  let autoSkillsCriterion: TeamEligibilityCriterion & { score: number } = {
    eligible: false,
    rank: 0,
    score: 0,
    reason: ""
  };
  const autoSkillsRank = autoRankings.findIndex((r) => r.programming?.team.id === team.id) + 1;
  const autoSkillsRecord = autoRankings[autoSkillsRank - 1]?.programming;
  if (!autoSkillsRank || !autoSkillsRecord) {
    autoSkillsCriterion = { eligible: false, rank: 0, score: 0, reason: "No Data" };
  } else if (autoSkillsRecord.score < 1) {
    autoSkillsCriterion = {
      eligible: false,
      rank: autoSkillsRank,
      score: autoSkillsRecord.score,
      reason: `Zero Score`,
    };
  } else if (autoSkillsRank > skillsThreshold) {
    autoSkillsCriterion = {
      eligible: false,
      rank: autoSkillsRank,
      score: autoSkillsRecord.score,
      reason: `Auto Skills Rank ${autoSkillsRank} [score: ${autoSkillsRecord.score}]`,
    };
  } else {
    autoSkillsCriterion = {
      eligible: true,
      rank: autoSkillsRank,
      score: autoSkillsRecord.score,
      reason: `Auto Skills Rank ${autoSkillsRank} [score: ${autoSkillsRecord.score}]`,
    };
  }

  // --- Overall Skills Criterion with Tie-Breaking ---
  const skillsRecordValue = aggregatedSkills[effectiveSkillsRank - 1]?.overall || 0;
  console.log(`Team ${team.id} initial overall skills rank (${targetGrade}): ${effectiveSkillsRank}, score: ${skillsRecordValue}`);
  
  // Build a missing attempts message (rank & score are always shown)
  let missingAttemptMsg = "";
  const teamHasDriver = skills.find((r) =>
    (r.driver?.score ?? 0) > 0 && ((r.driver?.team.id ?? 0) === team.id)
  );
  const teamHasProgramming = skills.find((r) =>
    (r.programming?.score ?? 0) > 0 && ((r.programming?.team.id ?? 0) === team.id)
  );
  if (!teamHasDriver || !teamHasProgramming) {
    missingAttemptMsg = " (Missing Driver or Programming attempt)";
  }
  
  let skillsCriterion: TeamEligibilityCriterion & { score: number };

  // Check for ties within the aggregated (and, if needed, grade-filtered) skills.
  const tiedRecords = aggregatedSkills.filter((r) => r.overall === skillsRecordValue);
  console.log(`Team ${team.id} tied aggregated records:`, tiedRecords.map((r) => r.driver?.team.id ?? r.programming?.team.id));
  
  if (rawSkills && tiedRecords.length > 1) {
    // Filter rawSkills to only consider teams in the current subgroup.
    const currentGroupTeamIds = new Set(aggregatedSkills.map((r) => r.driver?.team.id ?? r.programming?.team.id));
    const filteredRawSkills = rawSkills.filter((s) => currentGroupTeamIds.has(s.team.id));
    console.log(`Filtered raw skills for grade ${targetGrade}:`, filteredRawSkills);
    
    // Get unique team IDs among the tied records.
    const tiedTeamIds = Array.from(new Set(tiedRecords.map((r) => r.driver?.team.id ?? r.programming?.team.id)));
    console.log("Tied team IDs:", tiedTeamIds);
    
    // Sort these team IDs using the tie-breaker comparator.
    const sortedTiedTeamIds = [...tiedTeamIds].sort((a, b) => compareTieBreakers(a!, b!, filteredRawSkills));
    console.log("Sorted tied team IDs (tie-breaker):", sortedTiedTeamIds);
    
    const tieBreakerRank = sortedTiedTeamIds.indexOf(team.id) + 1;
    console.log(`Team ${team.id} tie-breaker rank: ${tieBreakerRank}`);
    effectiveSkillsRank = tieBreakerRank;
    skillsCriterion = {
      eligible: tieBreakerRank <= effectiveSkillsThreshold,
      rank: tieBreakerRank,
      score: skillsRecordValue,
      reason: `Overall Skills Rank ${tieBreakerRank} (Tie-Breaker) [score: ${skillsRecordValue}]${missingAttemptMsg}`,
    };
  } else {
    skillsCriterion = {
      eligible: effectiveSkillsRank <= effectiveSkillsThreshold,
      rank: effectiveSkillsRank,
      score: skillsRecordValue,
      reason: `Overall Skills Rank ${effectiveSkillsRank} [score: ${skillsRecordValue}]${missingAttemptMsg}`,
    };
  }
  
  // Overall eligibility is met only if all three criteria are true.
  const overallEligible = rankingCriterion.eligible && autoSkillsCriterion.eligible && skillsCriterion.eligible;
  
  console.log(`Team ${team.id} eligibility breakdown:`, {
    ranking: rankingCriterion,
    autoSkills: autoSkillsCriterion,
    skills: skillsCriterion,
    overallEligible,
  });
  
  return {
    team,
    eligible: overallEligible,
    ranking: rankingCriterion,
    autoSkills: autoSkillsCriterion,
    skills: skillsCriterion,
  };
}

export type GetTeamEligibilityListArgs = {
  teams: Team[];
  rankings: Ranking[];
  skills: TeamRecord[];
  rankingThreshold: number;
  skillsThreshold: number;
  rawSkills?: Skill[];
  targetGrade?: string; // "Overall" or a specific grade (e.g., "Middle School")
};

export function getTeamEligibilityList({
  teams,
  rankings,
  skills,
  rankingThreshold,
  skillsThreshold,
  rawSkills,
  targetGrade = "Overall",
}: GetTeamEligibilityListArgs): TeamEligibility[] {
  // Build a grade lookup from full Team objects.
  const gradeLookup = new Map<number, string>();
  teams.forEach((tm) => gradeLookup.set(tm.id, tm.grade));
  console.log("Grade Lookup:", Array.from(gradeLookup.entries()));
  
  const autoRankings = [...skills].sort(
    (a, b) => (b.programming?.score ?? 0) - (a.programming?.score ?? 0)
  );
  console.log("Auto rankings (aggregated):", autoRankings.map((r) => r.driver?.team.id ?? r.programming?.team.id));
  
  return teams.map((tm) =>
    getTeamEligibility({
      team: tm,
      rankings,
      autoRankings,
      skills,
      rankingThreshold,
      skillsThreshold,
      rawSkills,
      targetGrade,
      gradeLookup,
    })
  );
}
