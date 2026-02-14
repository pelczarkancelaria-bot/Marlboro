export type TaskStatus = 'open' | 'done';
export type TaskLinkType = 'document' | 'case' | null;

export interface Task {
  id: string;
  title: string;
  dueAt: Date;
  assignedToUid: string;
  assignedToName: string;
  assignedToEmail: string;
  createdByUid: string;
  createdAt?: Date;
  status: TaskStatus;
  linkType?: TaskLinkType;
  linkId?: string | null;
  note?: string | null;
}
