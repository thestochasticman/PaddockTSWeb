"use client";
import { Selection } from "./Selection";

export type SavedQuery = {
  id: string;
  name: string;
  bbox: Selection;
  verticesText: string;
  startDate: string;
  endDate: string;
};