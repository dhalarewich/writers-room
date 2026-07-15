export type Stage =
  | 'inbox'
  | 'ideas'
  | 'approved'
  | 'drafting'
  | 'editing'
  | 'ready'
  | 'published';

export const STAGE_DIRS: Record<Stage, string> = {
  inbox: '0-inbox',
  ideas: '1-ideas',
  approved: '2-approved',
  drafting: '3-drafting',
  editing: '4-editing',
  ready: '5-ready',
  published: '6-published',
};

export const STAGES: Stage[] = [
  'inbox',
  'ideas',
  'approved',
  'drafting',
  'editing',
  'ready',
  'published',
];

export type GateName = 'facts' | 'critique' | 'voice';
export type GateState = 'pending' | 'passed' | 'blocked' | 'n/a';
export const GATE_NAMES: GateName[] = ['facts', 'critique', 'voice'];
export const GATE_STATES: GateState[] = ['pending', 'passed', 'blocked', 'n/a'];

export interface Series {
  of: string;
  seq: number;
  len: number;
}

export interface CardMeta {
  id: string;
  title: string;
  channel: string[];
  pillar?: string;
  tags: string[];
  score?: number;
  series?: Series;
  gates: Record<GateName, GateState>;
  needs: string[];
  pinned: boolean;
  source?: string;
  created: string;
  updated: string;
}

export interface Card {
  meta: CardMeta;
  body: string;
  path: string;
  stage: Stage;
}

export interface StudioConfig {
  name: string;
  prefix: string;
  channels: string[];
  pillars: string[];
  thresholds: { min_score: number; max_per_run: number };
  feeds: Record<string, string[]>;
}

export interface Studio {
  root: string;
  config: StudioConfig;
}
