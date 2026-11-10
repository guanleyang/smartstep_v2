import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Translate = (zh: string, en: string) => string;
type Language = "zh" | "en";
const key = "smartstep-language";
const Context = createContext<{ lang: Language; setLang: (lang: Language) => void; t: Translate }>({lang:"zh",setLang:()=>{},t:zh=>zh});
export function LanguageProvider({children}: {children: ReactNode}) {
  const [lang, setLang] = useState<Language>(() => { try { return localStorage.getItem(key) === "en" ? "en" : "zh"; } catch { return "zh"; } });
  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    try { localStorage.setItem(key, lang); } catch {}
  }, [lang]);
  const t = useCallback<Translate>((zh,en)=>lang==="en"?en:zh,[lang]);
  return <Context.Provider value={{lang,setLang,t}}>{children}</Context.Provider>;
}
export const useLanguage = () => useContext(Context);
export function indoorName(name: string, lang: Language) {
  if (lang === "zh") return name;
  return name.replace(/^(TR\d+) 教室内$/, "Inside $1")
    .replace(/^(TR\d+) 门口$/, "$1 entrance")
    .replace("B1 · 电梯", "B1 · Lift").replace("1楼 · 电梯", "Level 1 · Lift")
    .replace("SS2 Stairs to 天台", "SS2 Stairs to Rooftop");
}
