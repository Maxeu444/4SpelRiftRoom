export type Role = "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY" | "FILL";

export type CoachingInsight = {
  type: "priority" | "success" | "watch";
  title: string;
  detail: string;
  action: string;
};
