import { mockSession } from "../data/mock";

export const authService = {
  getCurrentUser: async () => mockSession
};
