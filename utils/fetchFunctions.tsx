import { KeyRequiredError, fetchJson, isKeyRequired } from "@/lib/api-client";
import { UserIntraInfo } from "@/types";

export const fetchUserIntraInfo = async (
    login: string,
  ): Promise<UserIntraInfo | null> => {
    const response = await fetch(`/api/users/${login}/intra`)
    if (response.status === 428) {
      throw new KeyRequiredError();
    }
    if (!response.ok) {
      // Swallowing this into a null return, as this used to, left the
      // dashboard waiting on data a 429 or a dead call was never going to
      // send -- the status has to reach the caller for the same reason a
      // missing key does.
      throw new Error(`Failed to fetch user info (${response.status})`);
    }
    const data = await response.json();
    if (!data || !data.id) {
      throw new Error("Invalid user data received");
    }
    return data;
  };

export const getCampusRank = async (campus: string, user_login: string): Promise<any> => {
    try {
      // fetchJson, for the 202s: a rank needs the whole campus, and Paris is
      // read over several requests.
      const data = await fetchJson<{ rank?: number }>(`/api/users/${user_login}/rank`);
      return data.rank || null;
    } catch (error) {
      if (isKeyRequired(error)) {
        throw error;
      }
      console.error("Error fetching campus rank:", error);
      throw error;
    }
  };
