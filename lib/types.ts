export type Profile = {
  id: string;
  display_name: string | null;
  unit_system: "kg" | "lb";
  starting_weight_kg: number | null;
  goal_weight_kg: number | null;
  treatment_type: string | null;
  treatment_start_date: string | null;
  theme_preference: "system" | "light" | "dark";
  hydration_unit: "glasses" | "ml";
  hydration_target_ml: number;
  timezone: string;
};

export type WeightEntry = {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_at: string;
  notes: string | null;
};

export type Food = {
  id: string;
  user_id: string | null;
  name: string;
  calories_per_serving: number;
  serving_size: string | null;
  is_custom: boolean;
  is_favorite: boolean;
};

export type FoodLog = {
  id: string;
  user_id: string;
  food_id: string | null;
  food_name_snapshot: string;
  calories: number;
  servings: number;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  eaten_at: string;
  notes: string | null;
};

export type ExerciseLog = {
  id: string;
  user_id: string;
  exercise_type: string;
  duration_minutes: number;
  intensity: "light" | "medium" | "hard";
  notes: string | null;
  performed_at: string;
};

export type WellnessEntry = {
  id: string;
  user_id: string;
  logged_for_date: string;
  mood_rating: number | null;
  energy_rating: number | null;
  hydration_glasses: number;
  hydration_ml: number;
  symptoms: string[] | null;
  journal_notes: string | null;
};

export type CoachInvite = {
  code: string;
  client_id: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
};

export type CoachRelationship = {
  id: string;
  coach_id: string;
  client_id: string;
  created_at: string;
};