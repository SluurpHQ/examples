// The app's page: its data, and the list — an island, which another site
// can embed as it is (see the Sluurp website's examples page).
import Todos from "../islands/todos.tsx";

export const schema = {
  todos: { fields: { title: "text!", done: "bool" }, rules: "" },
} as const;

export default () => <main><Todos /></main>;
