
export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface AnalysisResult {
  landmarkName: string;
  history: string;
  sources: GroundingSource[];
  audioDataUrl: string;
}

export interface HistoryItem {
  id: string;
  imageUrl: string;
  landmarkName: string;
  history: string;
  sources: GroundingSource[];
  audioDataBase64: string;
}
