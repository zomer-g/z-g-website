# Database check: `db-t0-render` → `db-t1-xhostd-restore`

| | before | after |
|---|---|---|
| host | dpg-d6jihipaae7s7396jmg0-a.frankfurt-postgres.render.com | db.xhostd.com |
| database | zg_website | ch_e18e80340afb41a180e3634fedb7f6ab |
| version | PostgreSQL 18.3 (Debian 18.3-1.pgdg12+1) on x86_64-pc-linux-gnu, compiled by gcc (Debian 12.2.0-14+deb12u1) 12.2.0, 64-bit | PostgreSQL 18.4 (Debian 18.4-1.pgdg13+1) on x86_64-pc-linux-gnu, compiled by gcc (Debian 14.2.0-19) 14.2.0, 64-bit |
| taken | 2026-09-12T20:28:03.938Z | 2026-09-13T06:16:02.095Z |
| extensions | pg_trgm@1.6, plpgsql@1.0 | pg_trgm@1.6, plpgsql@1.0 |

## Tables — 50/51 identical

Differences: tagit_sync_state

| table | rows before | rows after | Δ | hash mode | content | indexes | |
|---|---|---|---|---|---|---|---|
| Account | 5 | 5 | 0 | full | same | same | ✓ |
| CaseDocument | 19 | 19 | 0 | full | same | same | ✓ |
| Media | 9 | 9 | 0 | full | same | same | ✓ |
| MediaAppearance | 57 | 57 | 0 | full | same | same | ✓ |
| Page | 55 | 55 | 0 | full | same | same | ✓ |
| PlilistPost | 7 | 7 | 0 | full | same | same | ✓ |
| Post | 13 | 13 | 0 | full | same | same | ✓ |
| Service | 11 | 11 | 0 | full | same | same | ✓ |
| Session | 65 | 65 | 0 | full | same | same | ✓ |
| SiteSettings | 1 | 1 | 0 | full | same | same | ✓ |
| Submission | 3 | 3 | 0 | full | same | same | ✓ |
| User | 4 | 4 | 0 | full | same | same | ✓ |
| VerificationToken | 0 | 0 | 0 | full | same | same | ✓ |
| ca_records | 35110 | 35110 | 0 | full | same | same | ✓ |
| ca_sync | 1 | 1 | 0 | full | same | same | ✓ |
| foi_decided_examples | 149 | 149 | 0 | full | same | same | ✓ |
| foi_guide_chunks | 325 | 325 | 0 | full | same | same | ✓ |
| foi_guide_docs | 22 | 22 | 0 | full | same | same | ✓ |
| foi_law_sections | 22 | 22 | 0 | full | same | same | ✓ |
| guideline_chunks | 31738 | 31738 | 0 | pk | same | same | ✓ |
| guideline_docs | 12281 | 12281 | 0 | full | same | same | ✓ |
| guideline_embeddings | 3452 | 3452 | 0 | full | same | same | ✓ |
| guideline_sync_state | 1 | 1 | 0 | full | same | same | ✓ |
| mcp_invites | 2 | 2 | 0 | full | same | same | ✓ |
| mcp_oauth_access_tokens | 0 | 0 | 0 | full | same | same | ✓ |
| mcp_oauth_auth_codes | 16 | 16 | 0 | full | same | same | ✓ |
| mcp_oauth_clients | 19 | 19 | 0 | full | same | same | ✓ |
| mcp_usage | 23 | 23 | 0 | full | same | same | ✓ |
| milon_entries | 7 | 7 | 0 | full | same | same | ✓ |
| pach_comments | 24 | 24 | 0 | full | same | same | ✓ |
| pach_reports | 310 | 310 | 0 | full | same | same | ✓ |
| pach_system_messages | 74 | 74 | 0 | full | same | same | ✓ |
| sanegoria_cases | 108970 | 108970 | 0 | full | same | same | ✓ |
| sanegoria_hearings | 51627 | 51627 | 0 | full | same | same | ✓ |
| sanegoria_offenses | 137537 | 137537 | 0 | full | same | same | ✓ |
| tagit_docs | 82459 | 82459 | 0 | pk | same | same | ✓ |
| tagit_sync_state | 3 | 3 | 0 | full | differs | same | 🔴 |
| timeline_event_tags | 0 | 0 | 0 | full | same | same | ✓ |
| timeline_events | 0 | 0 | 0 | full | same | same | ✓ |
| timeline_layers | 1 | 1 | 0 | full | same | same | ✓ |
| timeline_media | 0 | 0 | 0 | full | same | same | ✓ |
| timeline_project_access | 0 | 0 | 0 | full | same | same | ✓ |
| timeline_projects | 1 | 1 | 0 | full | same | same | ✓ |
| timeline_tags | 0 | 0 | 0 | full | same | same | ✓ |
| whatsapp_chats | 6 | 6 | 0 | full | same | same | ✓ |
| whatsapp_media | 213 | 213 | 0 | full | same | same | ✓ |
| whatsapp_message_tags | 0 | 0 | 0 | full | same | same | ✓ |
| whatsapp_messages | 1067 | 1067 | 0 | full | same | same | ✓ |
| whatsapp_tags | 0 | 0 | 0 | full | same | same | ✓ |
| whatsapp_workspace_access | 3 | 3 | 0 | full | same | same | ✓ |
| whatsapp_workspaces | 1 | 1 | 0 | full | same | same | ✓ |

## Sequences on the after side — 12/12 ahead of their column

All sequences are at or past the highest value in their column.
