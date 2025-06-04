import { Layer } from "effect";
import { UserRepository } from "./domain/repositories/UserRepository";
import { ProfileService, ProfileServiceLayer } from "./application/services/ProfileService";
import { HttpUserRepository } from "./infrastructure/repositories/HttpUserRepository";

// HTTP repository layer for production use
export const HttpUserRepositoryLayer = Layer.succeed(
  UserRepository,
  new HttpUserRepository()
);

// Main profile module layer
export const ProfileModuleLayer = Layer.provide(
  ProfileServiceLayer,
  HttpUserRepositoryLayer
);

// Export for use in other modules
export { UserRepository, ProfileService };
