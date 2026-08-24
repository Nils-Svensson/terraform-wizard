import type { LayoutFn } from "./types";
import { layoutDag } from "./dagLayout";
import { layoutRadial } from "./radialDag";


export const layouts = {
  dag: layoutDag,
  radial: layoutRadial,
} satisfies Record<string, LayoutFn>;

export type LayoutType = keyof typeof layouts;
