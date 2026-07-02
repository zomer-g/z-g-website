// Default hero copy for the /dictionary page. Stored in a Page row (slug
// "dictionary") once the admin edits it; until then these hardcoded values
// are used. Shared by the public page, the settings API, and the admin panel.

export interface DictionaryHeader {
  title: string;
  subtitle: string;
}

export const DICTIONARY_HEADER_DEFAULTS: DictionaryHeader = {
  title: "מִילוֹן",
  subtitle:
    "ביטויים ומונחים שהמצאתי סביב הפעילות בתחומי משפט, טכנולוגיה ושקיפות ממשלתית — כי לפעמים השפה הקיימת לא מספיקה.",
};

export const DICTIONARY_HEADER_SLUG = "dictionary";
