export interface Exercise {
  id: string;
  title: string;
  subtitle: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  defaultTempo: number;
  /** AlphaTex source — used for built-in exercises */
  tex?: string;
  /** URL to a GP binary file — used for directory exercises */
  filePath?: string;
}
