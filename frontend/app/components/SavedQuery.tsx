"use client";
import { Selection } from "./Selection";

export type SavedQuery = {
  name: string;
  bbox: Selection;
  verticesText: string;
  startDate: string;
  endDate: string;
};