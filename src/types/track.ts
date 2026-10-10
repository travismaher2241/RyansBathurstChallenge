export interface TrackMetadata {
  schema_version: string;
  name: string;
  lap_length_m: number;
  race_direction: string;
  published_turn_count: number;
  detected_bend_group_count: number;
  axes: {
    game_east_m: string;
    game_north_m: string;
    heading: string;
    curvature: string;
    offset_right_m: string;
  };
}

export interface Segment {
  id: number;
  s_start_m: number;
  s_end_m: number;
  length_m: number;
  turn_radians: number;
  curvature_right_per_m: number;
  height_start_m: number;
  height_end_m: number;
  elevation_start_m: number;
  elevation_end_m: number;
  gradient_percent: number;
  east_start_m: number;
  north_start_m: number;
  east_end_m: number;
  north_end_m: number;
  road_width_m: number;
  environment: string;
  area: string;
  rumble_colour: string;
  surface: string;
  banking_deg_estimate: number;
}

export interface Corner {
  id: string;
  area: string;
  s_start_m: number;
  s_apex_m: number;
  s_end_m: number;
  length_m: number;
  direction: 'left' | 'right';
  turn_angle_deg: number;
  effective_radius_m: number;
  min_local_radius_m: number;
  elevation_apex_m: number;
}

export interface Straight {
  id: string;
  name: string;
  s_start_m: number;
  s_end_m: number;
  length_m: number;
  max_up_gradient_percent: number;
  max_down_gradient_percent: number;
}

export interface SceneryItem {
  id: string;
  name: string;
  sprite_key: string;
  s_m: number;
  offset_right_m: number;
  game_east_m: number;
  game_north_m: number;
  terrain_elevation_m?: number;
  terrain_height_relative_m?: number;
  width_m_estimate?: number;
  height_m_estimate?: number;
  collidable: boolean;
  ahead_m?: number;
}

export interface EnvironmentZone {
  start_m: number;
  end_m: number;
  name: string;
  environment: string;
  road_width_m_estimate: number;
}

export interface TrackData {
  metadata: TrackMetadata;
  segments: Segment[];
  corners?: Corner[];
  straights?: Straight[];
  scenery: SceneryItem[];
  environment_zones?: EnvironmentZone[];
}

export type GameMode = 'arcade' | 'timetrial' | 'practice';

export interface GameSettings {
  difficulty: 'arcade' | 'pro';
  transmission: 'auto' | 'manual';
  autoAccelerate: boolean;
  crtFilter: boolean;
  soundEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  elevationExaggeration: number;
  drawDistanceM: number;
}
