import type { HTMLAttributes } from "vue";

export interface SphereIcon {
  x: number;
  y: number;
  z: number;
  scale: number;
  opacity: number;
  id: number;
}

export interface IconCloudProps {
  images?: string[];
  class?: HTMLAttributes["class"];
}

export { default as IconCloud } from "./IconCloud.vue";