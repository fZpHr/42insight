import { KeyRequiredError, isKeyRequired } from "@/lib/api-client";
import { UserIntraInfo } from "@/types";

export const fetchUserIntraInfo = async (
    login: string,
  ): Promise<UserIntraInfo | null> => {
    try {
      const response = await fetch(`/api/users/${login}/intra`)
      if (response.status === 428) {
        throw new KeyRequiredError();
      }
      if (!response.ok) {
        throw new Error("Failed to fetch user info");
      }
      const data = await response.json();
      if (!data || !data.id) {
        throw new Error("Invalid user data received");
      }
      return data;
    } catch (error) {
      // A missing key has to reach the caller: swallowing it into null leaves
      // the dashboard waiting on data that will never arrive, instead of
      // showing the prompt to connect a key.
      if (isKeyRequired(error)) {
        throw error;
      }
      console.error("Error fetching user intra info:", error);
      return null;
    }
  };

export const getCampusRank = async (campus: string, user_login: string): Promise<any> => {
    try {
      const response = await fetch(`/api/users/${user_login}/rank`)
      if (response.status === 428) {
        throw new KeyRequiredError();
      }
      if (!response.ok) {
        throw new Error("Failed to fetch campus rank");
      }
      const data = await response.json();
      return data.rank || null;
    } catch (error) {
      if (isKeyRequired(error)) {
        throw error;
      }
      console.error("Error fetching campus rank:", error);
      throw error;
    }
  };
