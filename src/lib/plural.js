// Counted nouns in English and Swahili: "1 loan" / "2 loans", "mkopo 1" / "mikopo 2".
// Pass the two English forms; the Swahili forms come from the translation of each.

/** The English text for n: one form for 1, the other for every other count. */
export const plural = (n, one, many) => (Number(n) === 1 ? one : many);
