export type DateCategory =
  | "Aventura"
  | "Romántico"
  | "Gastronomía"
  | "Cultura"
  | "En casa"
  | "Naturaleza"
  | "Sorpresa";

export type DateDifficulty = "fácil" | "medio" | "difícil";

export type DateIdea = {
  id: number;
  title: string;
  description: string;
  category: DateCategory;
  difficulty: DateDifficulty;
};

export const DATE_CATEGORIES: DateCategory[] = [
  "Aventura",
  "Romántico",
  "Gastronomía",
  "Cultura",
  "En casa",
  "Naturaleza",
  "Sorpresa",
];
