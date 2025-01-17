import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { CustomUseQueryOptions, Map, Match } from "@types";
import axios from "axios";

export type MatchesParams = {
  select?: string;
  match_id?: string;
  clan_ids?: string;
  caps?: number;
  caps_from?: number;
  map?: Map;
  duration_from?: number;
  duration_to?: number;
  factor?: number;
  conf?: string;
  event?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  desc?: boolean;
};

export const fetchMatches = async (params?: MatchesParams): Promise<Match[]> =>
  axios.get<Match[]>("/helo-api/matches", { params }).then(({ data }) => data);

export const useMatches = <T = Match[]>(
  params?: MatchesParams,
  options?: CustomUseQueryOptions<Match[], T>
): UseQueryResult<T> =>
  useQuery(["matches", params], () => fetchMatches(params), options);
