import raw from "@/data/generated/model.json";
import type { Model } from "./types";

export const model = raw as unknown as Model;

export const accountById = (id: string) => model.accounts.find((a) => a.id === decodeURIComponent(id));
export const docById = (id: string) => model.docs.find((d) => d.id === decodeURIComponent(id));
