

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

export interface LandmarkDetails {
  constructionDate: string;
  architecturalStyle: string;
  significance: string;
}

export interface NearbyAttraction {
  name: string;
  description: string;
}

export interface DiscoveryDetails {
  funFact: string;
  nearbyAttractions: NearbyAttraction[];
}

export interface AnalysisResult {
  landmarkName: string;
  history: string;
  sources: GroundingSource[];
  audioDataUrl: string;
  details?: LandmarkDetails;
  discovery?: DiscoveryDetails;
  rating?: number;
}

export interface HistoryItem {
  id: string;
  imageUrl: string;
  landmarkName: string;
  history: string;
  sources: GroundingSource[];
  audioDataBase64: string;
  details?: LandmarkDetails;
  discovery?: DiscoveryDetails;
  rating?: number;
}

export interface SimilarImage {
  imageUrl: string;
  description: string;
}