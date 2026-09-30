export interface Entity {
  table: string;
  label: string;
  title: string[];
  subtitle?: string[];
  search: string[];
  filters?: Record<string, string[]>;
  relations?: Record<string, string>;
  hidden?: string[];
  markdown?: string[];
  menu?: boolean;
  relationLabels?: Record<string, string>;
  reverseLabels?: Record<string, string>;
}
export const app: {
  name: string;
  authCollection: string;
  google?: boolean;
  entities: Entity[];
} = {
  name: "RaiseContext",
  authCollection: "users",
  entities: [
    {
      table: "rounds",
      label: "Rounds",
      title: ["name"],
      search: ["name", "description"],
      subtitle: ["status", "currency"],
      markdown: ["description"],
      relations: {
        created_by: "user_directory",
        updated_by: "user_directory",
      },
    },
    {
      table: "opportunities",
      label: "Opportunities",
      title: ["stage", "next_action"],
      search: ["stage", "next_action"],
      subtitle: ["currency", "proposed_minor"],
      filters: {
        stage: [
          "research",
          "introduction",
          "contacted",
          "meeting",
          "diligence",
          "decision",
          "closed",
          "passed",
        ],
      },
      relations: {
        round: "rounds",
        organization: "organizations",
        person: "people",
        owner: "user_directory",
        created_by: "user_directory",
        updated_by: "user_directory",
      },
      markdown: ["next_action", "pass_reason"],
    },
    {
      table: "organizations",
      label: "Organizations",
      title: ["name"],
      search: ["name", "description"],
      markdown: ["description"],
      relations: {
        created_by: "user_directory",
        updated_by: "user_directory",
      },
    },
    {
      table: "people",
      label: "People",
      title: ["name"],
      search: ["name", "email", "role"],
      subtitle: ["email", "role"],
      relations: {
        organization: "organizations",
        created_by: "user_directory",
        updated_by: "user_directory",
      },
    },
    {
      table: "commitments",
      label: "Commitments",
      title: ["status", "amount_minor", "currency"],
      search: ["evidence"],
      filters: {
        status: ["indicated", "signed", "cancelled"],
      },
      relations: {
        opportunity: "opportunities",
        created_by: "user_directory",
        updated_by: "user_directory",
      },
      markdown: ["evidence"],
    },
    {
      table: "receipts",
      label: "Receipts",
      title: ["status", "amount_minor", "currency"],
      search: ["evidence", "void_reason"],
      relations: {
        commitment: "commitments",
        created_by: "user_directory",
        updated_by: "user_directory",
      },
      markdown: ["evidence", "void_reason"],
    },
    {
      table: "introductions",
      label: "Introductions",
      title: ["status", "follow_up_at"],
      search: ["evidence", "source"],
      relations: {
        introducer: "people",
        target: "people",
        opportunity: "opportunities",
        created_by: "user_directory",
        updated_by: "user_directory",
      },
      markdown: ["evidence"],
    },
    {
      table: "activities",
      label: "Activities",
      title: ["title"],
      search: ["title", "body"],
      subtitle: ["kind", "status"],
      relations: {
        opportunity: "opportunities",
        person: "people",
        owner: "user_directory",
        created_by: "user_directory",
        updated_by: "user_directory",
      },
      markdown: ["body"],
    },
    {
      table: "notes",
      label: "Notes",
      title: ["title"],
      search: ["title", "body"],
      relations: {
        opportunity: "opportunities",
        person: "people",
        created_by: "user_directory",
        updated_by: "user_directory",
      },
      markdown: ["body"],
    },
    {
      table: "messages",
      label: "Correspondence",
      title: ["subject"],
      search: ["subject", "body"],
      subtitle: ["direction"],
      relations: {
        opportunity: "opportunities",
        person: "people",
        created_by: "user_directory",
        updated_by: "user_directory",
      },
      markdown: ["body"],
    },
    {
      table: "drafts",
      label: "Unsent drafts",
      title: ["subject"],
      search: ["subject", "body"],
      subtitle: ["status"],
      relations: {
        opportunity: "opportunities",
        person: "people",
        created_by: "user_directory",
        updated_by: "user_directory",
      },
      markdown: ["body"],
    },
    {
      table: "opportunity_participants",
      label: "Participants",
      title: ["role"],
      search: ["role"],
      relations: {
        opportunity: "opportunities",
        person: "people",
        created_by: "user_directory",
        updated_by: "user_directory",
      },
    },
    {
      table: "user_directory",
      label: "Colleagues",
      title: ["name"],
      search: ["name"],
      menu: false,
    },
  ],
};
