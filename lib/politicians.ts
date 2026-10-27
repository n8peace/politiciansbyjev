import data from "@/data/politicians.json";

export type Politician = {
  id: string;
  name: string;
  party: "R" | "D" | "I" | "Other" | "None";
  role: string;
  years: string;
  era: "current" | "historic";
  wikipedia: string;
  image: string;
  imageLicense: string;
  imageCredit: string;
  // Has publicly said they are LGBTQ. "Openly gay" questions answer only from these.
  publiclyOut?: boolean;
};

export const politicians = data as Politician[];

// Portraits are saved locally by scripts/fetch-faces.mjs.
export const faceSrc = (id: string) => `/faces/${id}.jpg`;
export const faceSmallSrc = (id: string) => `/faces/sm/${id}.jpg`;
