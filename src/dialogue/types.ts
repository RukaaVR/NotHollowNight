export interface DLine {
  /** Speaker label; 'Aeren' for the protagonist, '' for narration. */
  who: string;
  text: string;
}

export interface DChoice {
  label: string;
  /** Run when chosen. May return a follow-up script. */
  run: () => DialogueScript | void;
}

export interface DialogueScript {
  /** NPC id used to pick the portrait painter. */
  npc?: string;
  lines: DLine[];
  choices?: DChoice[];
}
