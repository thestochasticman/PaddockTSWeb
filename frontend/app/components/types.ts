export type Selection = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type SavedQuery = {
  name: string;
  bbox: Selection;
  verticesText: string;
  startDate: string;
  endDate: string;
};
