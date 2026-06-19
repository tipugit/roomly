import { useEffect, useState } from "react";
import { parseHashRoute } from "@/lib/share";

export function useHashRoute() {
  const [route, setRoute] = useState(() => parseHashRoute());

  useEffect(() => {
    const sync = () => setRoute(parseHashRoute());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return route;
}
