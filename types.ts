export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export type AppView = 'tour' | 'create' | 'chat' | 'converse';

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

export interface NearbyPlace {
    name: string;
    types: string[];
    shortFormattedAddress: string;
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
  details?: LandmarkDetails;
  discovery?: DiscoveryDetails;
  rating?: number;
}

export interface SimilarImage {
  imageUrl: string;
  description: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}