/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { MatchReportSchema } from "@schemas";
import { MatchReport, MatchReportClan } from "@types";
import { isoDateString } from "@util";
import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { Session } from "next-auth";
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

const joinClansForMatchId = (clans: MatchReportClan[]) =>
  clans.map((clan) => clan.tag).join("+");

const joinClansForFactions = (clans: MatchReportClan[]) =>
  clans.map(({ tag, players }) => `**${tag}** (${players})`).join(" & ") +
  (clans.length > 1
    ? ` => ${clans.reduce((acc, cur) => acc + cur.players, 0)}`
    : "");

const playerCount = (clans: MatchReportClan[]) =>
  clans.reduce((acc, cur) => acc + cur.players, 0);

const eventOrComment = (report: MatchReport) => {
  if (report.matchType === "Competitive" && report.event) {
    return ` (${report.event})`;
  }
  if (report.matchType === "Friendly" && report.comment) {
    return ` (${report.comment})`;
  }
  return "";
};

const buildPayload = (report: MatchReport, session: Session) => {
  const matchId = `${joinClansForMatchId(
    report.axisClans
  )}-${joinClansForMatchId(report.alliesClans)}-${
    new Date(report.date).toISOString().split("T")[0]
  }`;

  const fields: string[] = [
    `**${report.matchType}${eventOrComment(report)}**`,
    isoDateString(report.date),
    `Axis: ${joinClansForFactions(report.axisClans)}`,
    `Allies: ${joinClansForFactions(report.alliesClans)}`,
    `Result: **${report.result}** in **${report.time}min**`,
    `Map: **${report.map}**`,
    `Caps: ${report.caps
      .map((value, index) => (index === 2 ? `**${value}**` : value))
      .join("/")}`,
  ];

  if (report.streamUrl) {
    fields.push(
      `Stream: [${new URL(report.streamUrl).host}](${report.streamUrl})`
    );
  }

  return {
    embeds: [
      {
        color: 16750848,
        author: {
          name: session.user.name,
          icon_url: session.user.image,
        },
        title: matchId,
        url: `https://helo-system.de/matches/${matchId}`,
        description: fields.join("\n"),
      },
    ],
  };
};

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await unstable_getServerSession(req, res, authOptions);

  if (!session) return res.status(401).json({ message: "You need to login" });
  if (!session.user.isInGuild || !session.user.isTeamManager)
    return res.status(403).json({ message: "You are not a teammanager" });

  const result = MatchReportSchema.safeParse(req.body);
  if (!result.success)
    return res
      .status(400)
      .json({ message: "Please check your inputs", error: result.error });
  if (
    playerCount(result.data.axisClans) > 50 ||
    playerCount(result.data.alliesClans) > 50
  )
    return res.status(400).json({ message: "Too many players" });

  if (!process.env.DISCORD_REPORT_MATCH_WEBHOOK)
    return res.status(500).json({ message: "Please try again later" });

  try {
    await axios.post(
      process.env.DISCORD_REPORT_MATCH_WEBHOOK,
      buildPayload(result.data, session)
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }

  return res.status(200).json({ message: "Success" });
};
