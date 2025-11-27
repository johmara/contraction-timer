export interface Contraction {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  frequency?: number; // time since last contraction in seconds
}

export interface ContractionSession {
  id: string;
  startDate: Date;
  contractions: Contraction[];
  predictedBirthTime?: Date;
  isActive: boolean;
}

export interface BirthPrediction {
  estimatedTime: Date;
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
  avgFrequency: number;
  avgDuration: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}
