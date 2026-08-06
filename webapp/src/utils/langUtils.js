export const formatCategory = (category, lang) => {
  if (!category) return "";
  if (lang === "kh") return category.replace(/\s*\(.*?\)/g, "");
  const match = category.match(/\((.*?)\)/);
  return match ? match[1] : category.replace(/\s*\(.*?\)/g, "");
};
