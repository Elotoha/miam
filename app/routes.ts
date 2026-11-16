import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("foods", "routes/foods.tsx"),
  route("log", "routes/log.tsx"),
  route("plan", "routes/plan.tsx"),
  route("settings", "routes/settings.tsx"),
  route("logout", "routes/logout.tsx"),
] satisfies RouteConfig;
