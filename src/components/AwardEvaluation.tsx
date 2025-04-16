// AwardEvaluation.tsx
import { useCallback, useMemo } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/solid";
import {
  EventExcellenceAwards,
  EventRankings,
  EventSkills,
  EventTeams,
  EventTeamsByDivision,
  useByGrade,
} from "../util/eventHooks";
import { Event } from "robotevents/out/endpoints/events";
import { getTeamEligibilityList } from "../util/eligibility";
import * as csv from "csv-stringify/browser/esm/sync";
import { TeamEligibilityTable } from "./TeamEligibility";
import { DownloadButton } from "./Download";

const THRESHOLD = 0.5;

function roundToEven(num: number): number {
  const floorVal = Math.floor(num);
  const diff = num - floorVal;
  if (Math.abs(diff - 0.5) < Number.EPSILON) {
    return floorVal % 2 === 0 ? floorVal : floorVal + 1;
  } else {
    return Math.round(num);
  }
}

export type AwardEvaluationProps = {
  event: Event | null | undefined;
  rankings: EventRankings;
  divisionTeams: EventTeamsByDivision;
  eventTeams: EventTeams;
  division: number;
  excellence: EventExcellenceAwards;
  skills: EventSkills;
  rawSkills: any[]; // raw skills data fetched from the new hook
};

const AwardEvaluation: React.FC<AwardEvaluationProps> = (props) => {
  const division =
    props.event?.divisions.find((d) => d.id === props.division) ?? {
      id: 1,
      name: "Competition",
      order: 1,
    };

  const teams = useByGrade(
    props.divisionTeams[division.id],
    props.excellence.grade,
    []
  );
  const eventTeams = useByGrade(props.eventTeams, props.excellence.grade, []);
  const rankings = useByGrade(
    props.rankings[division.id],
    props.excellence.grade,
    []
  );
  const skills = useByGrade(props.skills, props.excellence.grade, []);

  const teamsInGroup = teams.length ?? 0;
  const rankingThreshold = roundToEven(teamsInGroup * THRESHOLD);
  const teamsInAge = eventTeams.length ?? 0;
  const skillsThreshold = roundToEven(teamsInAge * THRESHOLD);

  console.log("Teams in group:", teamsInGroup);
  console.log("Ranking threshold:", rankingThreshold);
  console.log("Teams in age:", teamsInAge);
  console.log("Skills threshold:", skillsThreshold);
  console.log("Raw skills (for tie-breakers):", props.rawSkills);

  const teamEligibility = useMemo(
    () =>
      getTeamEligibilityList({
        teams,
        rankings,
        skills,
        rankingThreshold,
        skillsThreshold,
        rawSkills: props.rawSkills,
      }),
    [teams, rankings, skills, rankingThreshold, skillsThreshold, props.rawSkills]
  );

  const eligibleTeams = useMemo(
    () => teams.filter((_, i) => teamEligibility[i].eligible),
    [teamEligibility, teams]
  );

  const downloadFilename = useMemo(
    () =>
      [
        props.event?.sku,
        division.name.toLowerCase().replace(/ /g, "_"),
        props.excellence.grade.toLowerCase().replace(/ /g, "_"),
        "excellence.csv",
      ].join("_"),
    [division.name, props.event?.sku, props.excellence.grade]
  );

  const getDownloadBlob = useCallback(
    () => new Blob([toCSVString(teamEligibility)], { type: "text/csv" }),
    [teamEligibility]
  );

  if ((props.event?.divisions.length ?? 1) > 1 && teams.length === 0) {
    return null;
  }

  return (
    <section className="mt-4">
      <h2 className="font-bold">
        {props.excellence.award.title}
        {(props.event?.divisions.length ?? 1) > 1
          ? ` — ${division.name}`
          : null}
      </h2>
      <p>Teams In Group: {teamsInGroup}</p>
      <p>
        Top 50% Threshold for Rankings: {(teamsInGroup * THRESHOLD).toFixed(2)}{" "}
        ⟶ {rankingThreshold}
      </p>
      <p>
        Top 50% Threshold for Skills: {(teamsInAge * THRESHOLD).toFixed(2)} ⟶{" "}
        {skillsThreshold}
      </p>
      <p className="mt-4">
        Teams Eligible For All Around Champion:{" "}
        <span className="italic">
          {eligibleTeams.length === 0 ? "None" : null}
        </span>
      </p>
      <ul className="flex flex-wrap gap-2 mt-2">
        {eligibleTeams.map((team) => (
          <li key={team.id} className="bg-green-400 text-black px-2 font-mono rounded-md">
            {team.number}
          </li>
        ))}
      </ul>
      <nav className="flex items-center justify-end mt-2">
        <DownloadButton contents={getDownloadBlob} filename={downloadFilename}>
          <ArrowDownTrayIcon height={18} className="inline" />
          <span className="font-mono">CSV</span>
        </DownloadButton>
      </nav>
      <TeamEligibilityTable teams={teamEligibility} />
    </section>
  );
};

export default AwardEvaluation;

function toCSVString(teamEligibility: any[]) {
  return csv.stringify(teamEligibility, {
    header: true,
    columns: [
      { key: "team.number", header: "Team" },
      { key: "eligible", header: "Eligible" },
      { key: "ranking.eligible", header: "Ranking Eligible" },
      { key: "ranking.reason", header: "Ranking Reason" },
      { key: "ranking.rank", header: "Ranking Rank" },
      { key: "skills.eligible", header: "Overall Skills Eligible" },
      { key: "skills.reason", header: "Overall Skills Reason" },
      { key: "skills.rank", header: "Overall Skills Rank" },
      { key: "skills.score", header: "Overall Skills Score" },
      { key: "autoSkills.eligible", header: "Auto Skills Eligible" },
      { key: "autoSkills.reason", header: "Auto Skills Reason" },
      { key: "autoSkills.rank", header: "Auto Skills Rank" },
      { key: "autoSkills.score", header: "Auto Skills Score" },
    ],
    cast: {
      boolean: (value: boolean) => (value ? "TRUE" : "FALSE"),
    },
  });
}
