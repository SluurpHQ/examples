/**
 * The Sheet example: the kit's `Spreadsheet`, kept in a collection over
 * sync, with everybody's pointer over it — all of it in `islands/sheet.tsx`,
 * which the website's Examples page shows as an island too.
 */
import { mount } from "sluurp/ui";
import Sheet from "./islands/sheet.tsx";

// Where the cells are: the collection this app's schema.json makes. Which
// sheet, and the name beside your pointer, from the address:
// `?sheet=plans&name=Ada`.
const params = new URLSearchParams(location.search);
mount("#app", () => <Sheet collection="cells" sheet={params.get("sheet") ?? "demo"} name={params.get("name") ?? undefined} />);
