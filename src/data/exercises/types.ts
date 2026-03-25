export interface Exercise {
  id: string;
  title: string;
  subtitle: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  defaultTempo: number;
  /** AlphaTex source for the exercise */
  tex: string;
}
