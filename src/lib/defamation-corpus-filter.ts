import type { FilterExpression } from "@/types/ruling-filter";

/**
 * The base query for /defamation-rulings.
 *
 * TAG-IT scope 4 is not a defamation corpus — it is every judgment its
 * crawler picked up from a set of courts, with the defamation extraction run
 * on top. Measured on the mirror: of 4,544 judgments only ~1,880 carry any
 * sign of being about defamation. The other ~2,660 are bank-debt claims,
 * eviction suits, car-insurance subrogation, default judgments and consent
 * settlements — they were filling the listing and the "recently added" strip.
 *
 * A judgment is kept when it shows at least one sign:
 *   · the extractor tagged it as a judgment under the defamation act;
 *   · it has a publications list, a publication description, or a platform;
 *   · a defense was claimed UNDER the defamation act specifically;
 *   · the summary names the cause of action.
 *
 * Two tempting signs are deliberately absent, both measured:
 *   · sql.הגנות_שנטענו on its own — the extractor fills that table for any
 *     civil defense (התיישנות, סיכול, הגנת הדייר), so it admitted 28 unrelated
 *     judgments. Hence the narrower "defense under THIS law" clause instead.
 *   · sql.מטרה_לפגוע.קביעה_על_מטרה_לפגוע — stored as `false` on ordinary civil
 *     cases, and `false` is not null, so it let in 57 pure debt claims.
 *
 * Of the judgments this drops, six mention "לשון הרע" anywhere in the record
 * (in passing, in unrelated suits) and none carry the defamation tag.
 *
 * `customQuery` REPLACES the allowedDocTypes base filter in /api/rulings, so
 * the "פסק דין" restriction has to be spelled out here too.
 */
export const DEFAMATION_CORPUS_FILTER: FilterExpression = {
  op: "and",
  clauses: [
    { field: "ai.כותרת_המסמך", op: "contains", value: "פסק דין" },
    {
      op: "or",
      clauses: [
        // The extractor's own verdict on what the document is.
        {
          field: "ai.תגיות",
          op: "contains",
          value: "פסק דין לפי חוק איסור לשון הרע",
        },
        // A defamation field the extractor actually filled in. On an array
        // field not_null means "has at least one element" — lax jsonpath
        // unwraps the array, so an empty one matches nothing.
        { field: "sql.רשימת_פרסומים", op: "not_null" },
        { field: "sql.תיאור_הפרסום", op: "not_null" },
        { field: "sql.פלטפורמה", op: "not_null" },
        // A defense claimed under the defamation act. `contains` on an array
        // field is exact element equality, which is what we want here.
        {
          field: "sql.הגנות_שנטענו.שם_החוק",
          op: "contains",
          value: "חוק איסור לשון הרע",
        },
        // Nothing structured, but the summary names the cause of action.
        { field: "ai.תקציר", op: "contains", value: "לשון הרע" },
      ],
    },
  ],
};
