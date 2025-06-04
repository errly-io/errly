import { Layer, ManagedRuntime } from "effect";
import { ProfileModuleLayer } from "@/modules/profile/di";

const MainLayer = Layer.provide(
  Layer.empty,
  ProfileModuleLayer
);

export const RuntimeClient = ManagedRuntime.make(MainLayer);