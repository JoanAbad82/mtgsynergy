export interface CardRecordMin {
  oracle_id: string;
  name: string;
  name_norm: string;
  lang?: string;
  set?: string;
  collector_number?: string;
  type_line?: string | null;
  oracle_text?: string | null;
  mana_cost?: string | null;
  cmc?: number | null;
  colors?: string[] | null;
  color_identity?: string[] | null;
  produced_mana?: string[] | null;
  keywords?: string[] | null;
  games?: string[] | null;
  legalities?: Record<string, string> | null;
}

export interface CardFeatures {
  types: string[];
  is_creature: boolean;
  produces_mana: boolean;
  draws_cards: boolean;
  removes: boolean;
  protects: boolean;
  tutors: boolean;
  token_maker: boolean;
  has_haste: boolean;
  has_prowess: boolean;
  creates_tokens: boolean;
  is_anthem: boolean;
  cares_about_spells: boolean;
  recurs_from_graveyard: boolean;
  is_low_cmc_creature: boolean;
  cmc_bucket: 0 | 1 | 2 | 3 | 4 | 5;
}
