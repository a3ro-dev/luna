export type UserPlan = "free" | "premium" | "premium+";

export interface AccentTheme {
  accent: string;
  accentSecondary: string;
  accentGlow: string;
  accentBorder: string;
  badge: string;
  badgeText: string;
}

export function getAccentTheme(plan: UserPlan): AccentTheme {
  switch (plan) {
    case "premium":
      return {
        accent: "#B8A9E8",
        accentSecondary: "#D6CBE3",
        accentGlow: "rgba(184,169,232,0.15)",
        accentBorder: "rgba(184,169,232,0.4)",
        badge: "#EDE8F5",
        badgeText: "#5B4A8A",
      };
    case "premium+":
      return {
        accent: "#E8C547",
        accentSecondary: "#F5E6B6",
        accentGlow: "rgba(232,197,71,0.15)",
        accentBorder: "rgba(232,197,71,0.4)",
        badge: "#FFF8E1",
        badgeText: "#7A6410",
      };
    default:
      return {
        accent: "#FFB5C0",
        accentSecondary: "#FFDDE0",
        accentGlow: "rgba(255,181,192,0.15)",
        accentBorder: "rgba(255,181,192,0.4)",
        badge: "#FFEEF1",
        badgeText: "#6D5A60",
      };
  }
}
