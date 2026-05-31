export type UtilityView = 'context' | 'task' | 'plan';

export type OpenChat = {
  id: string;
  agentName: string;
  title: string;
  createdAt: number;
  isNew: boolean;
};

export type SkillTab = 'overview' | 'chat' | 'prompt' | 'files';
